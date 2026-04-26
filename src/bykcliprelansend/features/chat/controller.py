from flask import request

from bykcliprelansend.common.response import R
from bykcliprelansend.features.chat.service import ChatService


def _get_client_ip() -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr or "unknown"


def register_routes(app, service: ChatService) -> None:
    @app.route("/api/chat/messages", methods=["GET"])
    def get_chat_messages():
        return R.success({
            "messages": service.list_messages(),
            "current_ip": _get_client_ip(),
        })

    @app.route("/api/chat/send", methods=["POST"])
    def send_chat_message():
        data = request.get_json()
        if not data or "message" not in data:
            return R.error("message is required", 400)

        message_text = data.get("message", "").rstrip()
        if not message_text.strip():
            return R.error("message cannot be empty", 400)

        message = service.send_message(_get_client_ip(), message_text)
        return R.success(message, "message sent")
