from typing import Optional

from flask import Response, request, stream_with_context

from bykcliprelansend.common.response import R


def _try_int(v) -> Optional[int]:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def register_routes(app) -> None:
    @app.route("/api/speedtest/download", methods=["GET"])
    def speedtest_download():
        size_mb = _try_int(request.args.get("size")) or 50
        if size_mb > 500:
            size_mb = 500

        size_bytes = size_mb * 1024 * 1024

        def generate():
            chunk_size = 1024 * 1024
            remaining = size_bytes
            while remaining > 0:
                to_read = min(chunk_size, remaining)
                yield b"\0" * to_read
                remaining -= to_read

        return Response(
            stream_with_context(generate()),
            content_type="application/octet-stream",
            headers={
                "Content-Length": str(size_bytes),
                "Content-Disposition": "attachment; filename=speedtest.bin",
            },
        )

    @app.route("/api/speedtest/upload", methods=["POST"])
    def speedtest_upload():
        try:
            if request.content_length:
                remaining = request.content_length
                while remaining > 0:
                    chunk = request.stream.read(min(remaining, 1024 * 1024))
                    if not chunk:
                        break
                    remaining -= len(chunk)
            else:
                while True:
                    chunk = request.stream.read(1024 * 1024)
                    if not chunk:
                        break
        except Exception:
            pass

        return R.success(message="upload test complete")
