import mimetypes
import os
import re
import tempfile
import urllib.parse
import zipfile
from typing import Dict, List

from flask import Response, abort, request, stream_with_context

from bykcliprelansend.common.response import R
from bykcliprelansend.features.files.service import FileShareService


def register_routes(app, service: FileShareService) -> None:
    @app.route("/api/file/<path:filename>")
    def api_file(filename):
        try:
            data = service.read_file_content(filename)
            return R.success(data)
        except ValueError:
            return R.error("Shared directory not specified", 400)
        except PermissionError:
            abort(404, description="Invalid path")
        except FileNotFoundError:
            abort(404, description="File not found")
        except Exception as e:
            return R.error(str(e), 500)

    @app.route("/api/tree")
    def api_tree():
        try:
            base = service.ensure_shared_directory()
        except ValueError:
            return R.error("Shared directory not specified", 400)
        tree = service.get_file_tree(base)
        return R.success({"tree": tree})

    @app.route("/api/directory")
    def api_directory():
        try:
            relative_path = request.args.get("path", "").strip("/")
            data = service.get_directory_listing(relative_path)
            return R.success(data)
        except ValueError:
            return R.error("Shared directory not specified", 400)
        except FileNotFoundError:
            return R.error("Directory not found", 404)

    @app.route("/api/preview/<path:filename>")
    def api_preview(filename):
        try:
            file_path = service.resolve_file_path(filename)
        except (ValueError, PermissionError):
            abort(404)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            abort(404)

        file_size = os.path.getsize(file_path)
        range_header = request.headers.get("Range")

        start = 0
        end = file_size - 1
        status_code = 200
        mimetype = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        headers = {
            "Content-Type": mimetype,
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
        }

        is_media = mimetype.startswith("video/") or mimetype.startswith("audio/")

        if range_header or is_media:
            effective_range = range_header or "bytes=0-"
            range_match = re.search(r"bytes=(\d+)-(\d*)", effective_range)
            if range_match:
                start = int(range_match.group(1))
                end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

                if start >= file_size or end >= file_size:
                    return Response(
                        "Requested Range Not Satisfiable",
                        status=416,
                        headers={"Content-Range": f"bytes */{file_size}"},
                    )

                if is_media:
                    max_media_chunk = 512 * 1024
                    end = min(end, start + max_media_chunk - 1)

                length = end - start + 1
                headers["Content-Length"] = str(length)
                headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
                status_code = 206

        headers.setdefault("Cache-Control", "no-cache")

        def generate_chunks(path, start_pos, size):
            with open(path, "rb") as f:
                f.seek(start_pos)
                bytes_to_read = size
                while bytes_to_read > 0:
                    chunk_size = 256 * 1024
                    data = f.read(min(chunk_size, bytes_to_read))
                    if not data:
                        break
                    bytes_to_read -= len(data)
                    yield data

        response_body = generate_chunks(file_path, start, end - start + 1)
        return Response(stream_with_context(response_body), status=status_code, headers=headers)

    @app.route("/api/download/<path:filename>")
    def api_download(filename):
        try:
            file_path = service.resolve_file_path(filename)
        except (ValueError, PermissionError):
            abort(404)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            abort(404)

        file_size = os.path.getsize(file_path)
        raw_name = os.path.basename(file_path)
        safe_name_utf8 = urllib.parse.quote(raw_name)
        fallback_name = raw_name.encode("ascii", "ignore").decode("ascii").strip()
        ext = os.path.splitext(raw_name)[1]
        if not fallback_name or fallback_name == ext:
            fallback_name = f"download{ext}" if ext else "download"

        headers = {
            "Content-Type": "application/octet-stream",
            "Content-Length": str(file_size),
            "Content-Disposition": f"attachment; filename=\"{fallback_name}\"; filename*=UTF-8''{safe_name_utf8}",
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }

        def generate():
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk

        return Response(stream_with_context(generate()), headers=headers, status=200)

    @app.route("/api/download-zip", methods=["POST"])
    def api_download_zip():
        data = request.get_json(silent=True) or {}
        paths = data.get("paths")
        if not isinstance(paths, list) or not paths:
            return R.error("paths required", 400)

        base = service.ensure_shared_directory()
        items: List[Dict[str, str]] = []
        for raw in paths:
            if not isinstance(raw, str) or not raw.strip():
                return R.error("invalid path", 400)
            rel_path = raw.strip("/").replace("\\", "/")
            try:
                abs_path = service.resolve_file_path(rel_path)
            except (ValueError, PermissionError):
                return R.error("invalid path", 400)
            if not os.path.exists(abs_path):
                return R.error("file not found", 404)
            items.append({"rel": rel_path, "abs": abs_path})

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        tmp_path = tmp.name
        tmp.close()

        arcname_set = set()
        with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for item in items:
                rel_path = item["rel"]
                abs_path = item["abs"]
                if os.path.isdir(abs_path):
                    for root, _, filenames in os.walk(abs_path):
                        for filename in filenames:
                            full_path = os.path.join(root, filename)
                            arcname = os.path.relpath(full_path, base).replace("\\", "/")
                            if arcname in arcname_set:
                                continue
                            arcname_set.add(arcname)
                            zf.write(full_path, arcname)
                else:
                    arcname = rel_path.replace("\\", "/")
                    if arcname in arcname_set:
                        continue
                    arcname_set.add(arcname)
                    zf.write(abs_path, arcname)

        file_size = os.path.getsize(tmp_path)
        if len(items) == 1:
            base_name = os.path.basename(items[0]["rel"].rstrip("/")) or "download"
            zip_name = f"{base_name}.zip"
        else:
            zip_name = "lansend.zip"

        safe_name_utf8 = urllib.parse.quote(zip_name)
        fallback_name = zip_name.encode("ascii", "ignore").decode("ascii").strip()
        ext = os.path.splitext(zip_name)[1]
        if not fallback_name or fallback_name == ext:
            fallback_name = f"download{ext}" if ext else "download"

        headers = {
            "Content-Type": "application/zip",
            "Content-Length": str(file_size),
            "Content-Disposition": f"attachment; filename=\"{fallback_name}\"; filename*=UTF-8''{safe_name_utf8}",
            "Cache-Control": "no-cache",
        }

        def generate():
            try:
                with open(tmp_path, "rb") as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
            finally:
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

        return Response(stream_with_context(generate()), headers=headers, status=200)
