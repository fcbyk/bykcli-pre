import os
from pathlib import Path

from bykcliprelansend.common.response import R
from bykcliprelansend.common.web import create_spa
from bykcliprelansend.features.chat.controller import register_routes as register_chat_routes
from bykcliprelansend.features.chat.service import ChatService
from bykcliprelansend.features.chat.store import ChatStore
from bykcliprelansend.features.files.controller import register_routes as register_file_routes
from bykcliprelansend.features.files.service import FileShareService
from bykcliprelansend.features.speedtest.controller import register_routes as register_speedtest_routes
from bykcliprelansend.features.upload.controller import register_routes as register_upload_routes
from bykcliprelansend.features.upload.service import UploadService


def create_app(file_service: FileShareService):
    package_root = Path(__file__).parent.parent
    static_dir = package_root / "bykclipre" / "web" / "dist"

    app = create_spa(static_dir=static_dir, entry_html="lansend.html")
    app.lansend_service = file_service

    @app.route("/api/config")
    def api_config():
        return R.success({
            "un_download": bool(getattr(file_service.config, "un_download", False)),
            "un_upload": bool(getattr(file_service.config, "un_upload", False)),
            "chat_enabled": bool(getattr(file_service.config, "chat_enabled", False)),
        })

    register_file_routes(app, file_service)

    if not file_service.config.un_upload:
        register_upload_routes(app, UploadService(file_service))

    if file_service.config.chat_enabled:
        register_chat_routes(app, ChatService(ChatStore()))

    register_speedtest_routes(app)
    return app


def start_web_server(port: int, file_service: FileShareService, run_server: bool = True):
    app = create_app(file_service)
    if not run_server:
        return app

    from waitress import serve

    cpu = os.cpu_count() or 2
    threads = min(16, max(4, cpu * 2))

    serve(
        app,
        host="0.0.0.0",
        port=port,
        max_request_body_size=100 * 1024 * 1024 * 1024,
        threads=threads,
    )
