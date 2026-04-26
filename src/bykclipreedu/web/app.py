import os
import logging
from flask import Flask, send_from_directory, make_response


log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


def create_spa(
    entry_html: str,
    root: str = "dist",
    page=None,
    cli_data=None,
) -> Flask:
    app = Flask(
        __name__,
        static_folder=f"{root}/assets",
        static_url_path="/assets"
    )

    dist_root = os.path.join(app.root_path, root)

    @app.route("/")
    def index():
        response = make_response(send_from_directory(dist_root, entry_html))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    if page:
        for url in page:
            def view(entry_html=entry_html, dist_root=dist_root):
                response = make_response(send_from_directory(dist_root, entry_html))
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
                return response

            endpoint = f"page_{url.strip('/').replace('/', '_') or 'root'}"
            app.add_url_rule(url, endpoint, view)

    if cli_data:
        app.cli_data = cli_data

    return app