from typing import Any, Tuple

from flask import jsonify


class R:
    """Web API response helpers."""

    @staticmethod
    def success(data: Any = None, message: str = "success") -> Tuple[Any, int]:
        return jsonify({
            "code": 200,
            "message": message,
            "data": data,
        }), 200

    @staticmethod
    def error(message: str = "error", code: int = 400, data: Any = None) -> Tuple[Any, int]:
        return jsonify({
            "code": code,
            "message": message,
            "data": data,
        }), code
