"""Web SPA application helpers."""

import logging
from pathlib import Path
from typing import List, Optional, Union


log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)


def create_spa(
    static_dir: Union[str, Path],
    entry_html: str = "index.html",
    page: Optional[List[str]] = None,
):
    """Create a Flask app that serves a bundled SPA."""
    from flask import Flask, make_response, send_from_directory

    static_dir = Path(static_dir).resolve()
    assets_dir = static_dir / "assets"

    app = Flask(
        __name__,
        static_folder=str(assets_dir),
        static_url_path="/assets",
    )

    @app.route("/")
    def index():
        response = make_response(send_from_directory(str(static_dir), entry_html))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    if page:
        for url in page:
            def view(entry_html=entry_html, static_dir=static_dir):
                response = make_response(send_from_directory(str(static_dir), entry_html))
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
                return response

            endpoint = f"page_{url.strip('/').replace('/', '_') or 'root'}"
            app.add_url_rule(url, endpoint, view)

    return app
