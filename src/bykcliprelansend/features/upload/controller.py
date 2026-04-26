from typing import Optional

from flask import request

from bykcliprelansend.common.response import R
from bykcliprelansend.features.upload.service import UploadService


def _try_int(v) -> Optional[int]:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _get_client_ip() -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr or "unknown"


def register_routes(app, service: UploadService) -> None:
    def verify_password_from_request():
        password = request.headers.get("X-Upload-Password") or request.form.get("password")
        return service.verify_password(password)

    @app.route("/api/upload/init", methods=["POST"])
    def upload_init():
        ip = _get_client_ip()
        err = verify_password_from_request()
        if err:
            return err

        filename_raw = (request.form.get("filename") or "").strip()
        size = _try_int(request.form.get("size"))
        rel_path = (request.form.get("path") or "").strip("/")
        chunk_size = _try_int(request.form.get("chunk_size")) or (8 * 1024 * 1024)
        total_chunks = _try_int(request.form.get("total_chunks"))

        try:
            result = service.init_upload(ip, filename_raw, size, rel_path, chunk_size, total_chunks)
            return R.success(result)
        except ValueError as e:
            return R.error(str(e), 400)
        except PermissionError:
            return R.error("invalid path", 400)
        except FileNotFoundError:
            return R.error("target directory not found", 400)

    @app.route("/api/upload/chunk", methods=["POST"])
    def upload_chunk():
        ip = _get_client_ip()
        err = verify_password_from_request()
        if err:
            return err

        upload_id = service.safe_upload_id(request.args.get("upload_id") or "")
        index = _try_int(request.args.get("index"))
        if not upload_id:
            return R.error("upload_id is required", 400)
        if index is None or index < 0:
            return R.error("index is required", 400)

        try:
            service.save_chunk(upload_id, index, request.stream, ip)
            return R.success(message="chunk uploaded")
        except FileNotFoundError:
            return R.error("upload not found", 404)
        except RuntimeError as e:
            return R.error(str(e), 500)

    @app.route("/api/upload/complete", methods=["POST"])
    def upload_complete():
        ip = _get_client_ip()
        err = verify_password_from_request()
        if err:
            return err

        data = request.get_json(silent=True) or {}
        upload_id = service.safe_upload_id(data.get("upload_id") or "")
        if not upload_id:
            return R.error("upload_id is required", 400)

        try:
            result = service.complete_upload(upload_id, ip)
            return R.success(result, "file uploaded")
        except FileNotFoundError:
            return R.error("upload not found", 404)
        except ValueError as e:
            return R.error(str(e), 400)
        except RuntimeError as e:
            return R.error(str(e), 500)

    @app.route("/api/upload/abort", methods=["POST"])
    def upload_abort():
        err = verify_password_from_request()
        if err:
            return err

        data = request.get_json(silent=True) or {}
        upload_id = service.safe_upload_id(data.get("upload_id") or "")
        if not upload_id:
            return R.error("upload_id is required", 400)

        service.abort_upload(upload_id)
        return R.success(message="upload aborted")

    @app.route("/upload", methods=["POST"])
    def upload_file():
        ip = _get_client_ip()
        rel_path = (request.form.get("path") or "").strip("/")
        size_hint = _try_int(request.form.get("size"))

        if "file" not in request.files and "password" in request.form:
            err = service.verify_password(request.form.get("password"))
            if err:
                return err
            if service.config.upload_password:
                return R.success(message="password ok")
            return R.error("upload password not set", 400)

        try:
            service.file_service.abs_target_dir(rel_path)
        except ValueError:
            service.file_service.log_upload(ip, 0, "failed (shared directory not set)", rel_path)
            return R.error("shared directory not set", 400)
        except PermissionError:
            service.file_service.log_upload(ip, 0, "failed (invalid path)", rel_path)
            return R.error("invalid path", 400)

        err = service.verify_password(request.form.get("password"))
        if err:
            service.file_service.log_upload(ip, 0, "failed (wrong or missing password)", rel_path)
            return err

        if "file" not in request.files:
            service.file_service.log_upload(ip, 0, "failed (no file field)", rel_path)
            return R.error("missing file", 400)

        file = request.files["file"]
        if file.filename == "":
            service.file_service.log_upload(ip, 0, "failed (no file selected)", rel_path)
            return R.error("no file selected", 400)

        file_size = file.content_length if file.content_length not in (None, 0) else size_hint
        if file_size is None:
            try:
                pos = file.stream.tell()
                file.stream.seek(0, 2)
                file_size = file.stream.tell()
                file.stream.seek(pos, 0)
            except Exception:
                file_size = None

        try:
            result = service.save_file(ip, file, rel_path, file_size)
            return R.success(result, "file uploaded")
        except FileNotFoundError:
            return R.error("target directory not found", 400)
        except PermissionError:
            return R.error("invalid path", 400)
        except RuntimeError as e:
            return R.error(str(e), 500)
