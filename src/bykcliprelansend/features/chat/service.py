from datetime import datetime
from typing import Any, Dict

from bykcliprelansend.features.chat.store import ChatStore


class ChatService:
    def __init__(self, store: ChatStore):
        self.store = store

    def list_messages(self) -> list[Dict[str, Any]]:
        return self.store.list_messages()

    def send_message(self, ip: str, text: str) -> Dict[str, Any]:
        message = {
            "id": len(self.store.list_messages()) + 1,
            "ip": ip,
            "message": text,
            "timestamp": datetime.now().isoformat(),
        }
        return self.store.add_message(message)
