import os
import secrets
import subprocess
import sys
import time
from functools import wraps
from flask import request, session, current_app, redirect
from flask_socketio import SocketIO, disconnect
from bykcli.api import get_private_networks

from ..web.app import create_spa
from ..web.R import R
from .service import SlideService


QR_LOGIN_TOKENS = {}
QR_TOKEN_TTL_SECONDS = 120


def _collect_local_ips():
    networks = get_private_networks()
    ips = []
    for net in networks:
        values = net.get("ips") or []
        for ip in values:
            ips.append(ip)
    return ips


def _get_wifi_name():
    try:
        if sys.platform.startswith("win"):
            output = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                stderr=subprocess.STDOUT,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            text = output.decode(errors="ignore")
            for line in text.splitlines():
                if "SSID" in line and "BSSID" not in line:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        name = parts[1].strip()
                        if name:
                            return name
        elif sys.platform == "darwin":
            try:
                output = subprocess.check_output(
                    ["/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport", "-I"],
                    stderr=subprocess.STDOUT,
                )
            except Exception:
                output = subprocess.check_output(
                    ["networksetup", "-getairportnetwork", "en0"],
                    stderr=subprocess.STDOUT,
                )
            text = output.decode(errors="ignore")
            for line in text.splitlines():
                if " SSID" in line or "Current Wi-Fi Network" in line:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        name = parts[1].strip()
                        if name:
                            return name
        else:
            try:
                output = subprocess.check_output(["iwgetid", "-r"], stderr=subprocess.STDOUT)
                name = output.decode(errors="ignore").strip()
                if name:
                    return name
            except Exception:
                output = subprocess.check_output(
                    ["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"],
                    stderr=subprocess.STDOUT,
                )
                text = output.decode(errors="ignore")
                for line in text.splitlines():
                    if line.startswith("yes:"):
                        name = line.split(":", 1)[1].strip()
                        if name:
                            return name
    except Exception:
        pass
    return ""


def _is_local_request():
    client_ip = request.remote_addr or ""
    if client_ip in ("127.0.0.1", "::1"):
        return True
    local_ips = current_app.config.get("SLIDE_LOCAL_IPS") or []
    return client_ip in local_ips


def _create_login_token():
    token = secrets.token_urlsafe(16)
    QR_LOGIN_TOKENS[token] = time.time()
    return token


def _consume_login_token(token):
    created_at = QR_LOGIN_TOKENS.pop(token, None)
    if not created_at:
        return False
    if time.time() - created_at > QR_TOKEN_TTL_SECONDS:
        return False
    return True


def create_slide_app(service: SlideService):
    app = create_spa("slide.html")
    app.secret_key = os.urandom(24)
    app.config["SLIDE_LOCAL_IPS"] = _collect_local_ips()
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', manage_session=False)
    app.slide_service = service
    register_routes(app, service)
    register_socketio_events(socketio, service)
    return app, socketio


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return R.error("Unauthorized", 401)
        return f(*args, **kwargs)
    return decorated_function


def require_socketio_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return
        return f(*args, **kwargs)
    return decorated_function


def register_routes(app, service: SlideService):
    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json()
        password = data.get('password', '')
        if service.verify_password(password):
            session['authenticated'] = True
            return R.success({"authenticated": True}, "Login successful")
        else:
            return R.error("Invalid password", 401)
    
    @app.route('/api/check_auth', methods=['GET'])
    def check_auth():
        authenticated = bool(session.get('authenticated'))
        return R.success({"authenticated": authenticated})
    
    @app.route('/api/logout', methods=['POST'])
    def logout():
        session.clear()
        return R.success(message="Logged out")
    
    @app.route('/internal/qr/info', methods=['GET'])
    def qr_info():
        if not _is_local_request():
            return "", 404
        token = _create_login_token()
        base_url = request.host_url.rstrip('/')
        login_url = base_url + '/auto-login?token=' + token
        wifi_name = _get_wifi_name()
        data = {"login_url": login_url}
        if wifi_name:
            data["wifi_name"] = wifi_name
        return R.success(data)
    
    @app.route('/internal/qr/status', methods=['GET'])
    def qr_status():
        if not _is_local_request():
            return "", 404
        token = request.args.get('token') or ''
        if not token:
            return R.success({"valid": False})
        created_at = QR_LOGIN_TOKENS.get(token)
        if not created_at:
            return R.success({"valid": False})
        if time.time() - created_at > QR_TOKEN_TTL_SECONDS:
            return R.success({"valid": False})
        return R.success({"valid": True})
    
    @app.route('/auto-login', methods=['GET'])
    def auto_login():
        token = request.args.get('token') or ''
        if not token:
            return redirect('/')
        if not _consume_login_token(token):
            return redirect('/')
        session['authenticated'] = True
        return redirect('/')
    
    @app.route('/api/next', methods=['POST'])
    @require_auth
    def next_slide():
        success, error = service.next_slide()
        if success:
            return R.success({"action": "next"})
        else:
            return R.error(error or "next failed", 500)
    
    @app.route('/api/prev', methods=['POST'])
    @require_auth
    def prev_slide():
        success, error = service.prev_slide()
        if success:
            return R.success({"action": "prev"})
        else:
            return R.error(error or "prev failed", 500)
    
    @app.route('/api/home', methods=['POST'])
    @require_auth
    def home_slide():
        success, error = service.home_slide()
        if success:
            return R.success({"action": "home"})
        else:
            return R.error(error or "home failed", 500)
    
    @app.route('/api/end', methods=['POST'])
    @require_auth
    def end_slide():
        success, error = service.end_slide()
        if success:
            return R.success({"action": "end"})
        else:
            return R.error(error or "end failed", 500)
    
    @app.route('/api/mouse/move', methods=['POST'])
    @require_auth
    def mouse_move():
        data = request.get_json()
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        success, error = service.move_mouse(dx, dy)
        if success:
            return R.success({"action": "move"})
        else:
            return R.error(error or "move failed", 500)
    
    @app.route('/api/mouse/click', methods=['POST'])
    @require_auth
    def mouse_click():
        success, error = service.click_mouse()
        if success:
            return R.success({"action": "click"})
        else:
            return R.error(error or "click failed", 500)
    
    @app.route('/api/mouse/down', methods=['POST'])
    @require_auth
    def mouse_down():
        success, error = service.mouse_down()
        if success:
            return R.success({"action": "down"})
        else:
            return R.error(error or "down failed", 500)
    
    @app.route('/api/mouse/up', methods=['POST'])
    @require_auth
    def mouse_up():
        success, error = service.mouse_up()
        if success:
            return R.success({"action": "up"})
        else:
            return R.error(error or "up failed", 500)
    
    @app.route('/api/mouse/rightclick', methods=['POST'])
    @require_auth
    def mouse_rightclick():
        success, error = service.right_click_mouse()
        if success:
            return R.success({"action": "rightclick"})
        else:
            return R.error(error or "rightclick failed", 500)
    
    @app.route('/api/mouse/scroll', methods=['POST'])
    @require_auth
    def mouse_scroll():
        data = request.get_json()
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        success, error = service.scroll_mouse(dx, dy)
        if success:
            return R.success({"action": "scroll"})
        else:
            return R.error(error or "scroll failed", 500)


def register_socketio_events(socketio: SocketIO, service: SlideService):
    @socketio.on('connect')
    def handle_connect():
        if not session.get('authenticated'):
            disconnect()
            return False
    
    @socketio.on('mouse_move')
    @require_socketio_auth
    def handle_mouse_move(data):
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        service.move_mouse(dx, dy)
    
    @socketio.on('mouse_click')
    @require_socketio_auth
    def handle_mouse_click():
        service.click_mouse()
    
    @socketio.on('mouse_down')
    @require_socketio_auth
    def handle_mouse_down():
        service.mouse_down()
    
    @socketio.on('mouse_up')
    @require_socketio_auth
    def handle_mouse_up():
        service.mouse_up()
    
    @socketio.on('mouse_rightclick')
    @require_socketio_auth
    def handle_mouse_rightclick():
        service.right_click_mouse()
    
    @socketio.on('mouse_scroll')
    @require_socketio_auth
    def handle_mouse_scroll(data):
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        service.scroll_mouse(dx, dy)
    
    @socketio.on('ping_server')
    @require_socketio_auth
    def handle_ping_server():
        return 'pong'
