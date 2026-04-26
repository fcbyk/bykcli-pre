from typing import Any, Dict, List


class ChatStore:
    def __init__(self, limit: int = 1000):
        self.limit = limit
        self._messages: List[Dict[str, Any]] = []

    def list_messages(self) -> List[Dict[str, Any]]:
        return list(self._messages)

    def add_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        self._messages.append(message)
        if len(self._messages) > self.limit:
            self._messages.pop(0)
        return message
