from flask import jsonify

class R:
    @staticmethod
    def success(data = None, message: str = "success"):
        return jsonify({
            "code": 200,
            "message": message,
            "data": data
        }), 200

    @staticmethod
    def error(message: str = "error", code: int = 400, data = None):
        return jsonify({
            "code": code,
            "message": message,
            "data": data
        }), code