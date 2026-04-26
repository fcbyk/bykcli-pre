import os
import click
import webbrowser
import uuid
from typing import Any
from flask import jsonify, request, send_file, url_for, Response
from bykcli.api import get_private_networks
from datetime import datetime
from .service import PickService
from ..web.app import create_spa

SERVER_SESSION_ID = str(uuid.uuid4())

default_config = {
    'items': []
}

app = create_spa(entry_html="pick.html", page=["/admin", "/f"])

files_mode_root = None
ADMIN_PASSWORD = None
service: PickService | None = None


def _require_admin_auth():
    if not ADMIN_PASSWORD:
        return jsonify({'error': 'admin password not set'}), 500

    password = request.headers.get('X-Admin-Password', '')
    if password != ADMIN_PASSWORD:
        return jsonify({'error': 'unauthorized'}), 401

    return None


@app.route('/api/info')
def api_info():
    return jsonify({
        'files_mode': files_mode_root is not None,
    })


@app.route('/api/items')
def api_items():
    if not service:
        return jsonify({'items': []})
    
    data = service._load_items_data()
    items = data.get('items', [])
    if not isinstance(items, list):
        items = []
    return jsonify({'items': items})


@app.route('/api/items/add', methods=['POST'])
def api_items_add():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    data = request.get_json(silent=True) or {}
    item = str(data.get('item', '')).strip()
    
    if not item:
        return jsonify({'error': '元素不能为空'}), 400
    
    success = service.add_item(item)
    
    if not success:
        return jsonify({'error': '元素已存在'}), 400
    
    return jsonify({'success': True, 'item': item})


@app.route('/api/items/batch', methods=['POST'])
def api_items_batch():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    data = request.get_json(silent=True) or {}
    items_str = str(data.get('items', ''))
    
    if not items_str:
        return jsonify({'error': '元素列表不能为空'}), 400
    
    import re
    items = [item.strip() for item in re.split(r'[\n\r,;]+', items_str) if item.strip()]
    
    if not items:
        return jsonify({'error': '没有有效的元素'}), 400
    
    duplicates = service.add_items(items)
    
    return jsonify({
        'success': True,
        'added_count': len(items) - len(duplicates),
        'duplicates': duplicates
    })


@app.route('/api/items/remove', methods=['DELETE'])
def api_items_remove():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    data = request.get_json(silent=True) or {}
    item = str(data.get('item', '')).strip()
    
    if not item:
        return jsonify({'error': '元素不能为空'}), 400
    
    success = service.remove_item(item)
    
    if not success:
        return jsonify({'error': '元素不存在'}), 400
    
    return jsonify({'success': True, 'item': item})


@app.route('/api/items/clear', methods=['DELETE'])
def api_items_clear():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    count = service.clear_items()
    
    return jsonify({'success': True, 'cleared_count': count})


@app.route('/api/items/update', methods=['PUT'])
def api_items_update():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    data = request.get_json(silent=True) or {}
    items = data.get('items', [])
    
    if not isinstance(items, list):
        return jsonify({'error': 'items 必须是列表'}), 400
    
    service.update_items(items)
    
    return jsonify({'success': True, 'count': len(items)})


def _get_client_ip():
    xff = request.headers.get('X-Forwarded-For', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.remote_addr or 'unknown'


@app.route('/api/files', methods=['GET'])
def api_files():
    if not files_mode_root:
        return jsonify({'error': 'files mode not enabled'}), 400

    files = service.list_files(files_mode_root)
    resp = {
        'files': [{'name': f['name'], 'size': f['size']} for f in files],
    }

    resp['session_id'] = SERVER_SESSION_ID

    if service.redeem_codes:
        total = len(service.redeem_codes)
        used = sum(1 for v in service.redeem_codes.values() if v)
        resp.update({
            'mode': 'code',
            'total_codes': total,
            'used_codes': used,
            'draw_count': used,
            'limit_per_code': 1,
        })
    else:
        client_ip = _get_client_ip()
        picked = service.ip_draw_records.get(client_ip)
        resp.update({
            'mode': 'ip',
            'draw_count': len(service.ip_draw_records),
            'ip_picked': picked,
            'limit_per_ip': 1,
        })
    return jsonify(resp)


@app.route('/api/files/pick', methods=['POST'])
def api_files_pick():
    if not files_mode_root:
        return jsonify({'error': 'files mode not enabled'}), 400

    files = service.list_files(files_mode_root)
    if not files:
        return jsonify({'error': 'no files available'}), 400

    client_ip = _get_client_ip()

    if service.redeem_codes:
        data = request.get_json(silent=True) or {}
        code = str(data.get('code', '')).strip().upper()
        if not code:
            return jsonify({'error': '请输入兑换码'}), 400
        if code not in service.redeem_codes:
            return jsonify({'error': '兑换码无效'}), 400
        if service.redeem_codes[code]:
            return jsonify({'error': '兑换码已被使用'}), 429

        used_by_ip = service.ip_file_history.get(client_ip, set())
        candidates = [f for f in files if f['name'] not in used_by_ip]
        if not candidates:
            return jsonify({'error': '本 IP 已无可抽取的文件'}), 400

        selected = service.pick_file(candidates)
        service.redeem_codes[code] = True
        try:
            service.mark_redeem_code_used_in_storage(code)
        except Exception:
            pass
        service.ip_file_history.setdefault(client_ip, set()).add(selected['name'])
        used = sum(1 for v in service.redeem_codes.values() if v)
        download_url = url_for('download_file', filename=selected['name'], _external=True)
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        service.code_results[code] = {
            'file': {'name': selected['name'], 'size': selected['size']},
            'download_url': download_url,
            'timestamp': timestamp,
        }
        click.echo(
            "[%s] %s draw file: %s successfully, redeem code: %s used, remaining redeem codes: %s"
            % (timestamp, client_ip, selected['name'], code, (len(service.redeem_codes) - used))
        )
        return jsonify({
            'file': {'name': selected['name'], 'size': selected['size']},
            'download_url': download_url,
            'mode': 'code',
            'draw_count': used,
            'total_codes': len(service.redeem_codes),
            'used_codes': used,
            'code': code,
        })

    if client_ip in service.ip_draw_records:
        return jsonify({'error': 'already picked', 'picked': service.ip_draw_records[client_ip]}), 429
    used_by_ip = service.ip_file_history.get(client_ip, set())
    candidates = [f for f in files if f['name'] not in used_by_ip]
    if not candidates:
        return jsonify({'error': '本 IP 已无可抽取的文件'}), 400

    selected = service.pick_file(candidates)
    service.ip_draw_records[client_ip] = selected['name']
    service.ip_file_history.setdefault(client_ip, set()).add(selected['name'])
    download_url = url_for('download_file', filename=selected['name'], _external=True)
    return jsonify({
        'file': {'name': selected['name'], 'size': selected['size']},
        'download_url': download_url,
        'mode': 'ip',
        'draw_count': len(service.ip_draw_records),
        'ip_picked': selected['name']
    })


@app.route('/api/files/result/<code>', methods=['GET'])
def api_files_result(code):
    if not files_mode_root:
        return jsonify({'error': 'files mode not enabled'}), 400
    code = str(code).strip().upper()
    if code not in service.code_results:
        return jsonify({'error': '兑换码未使用或结果不存在'}), 404
    result = service.code_results[code]
    return jsonify({
        'code': code,
        'file': result['file'],
        'download_url': result['download_url'],
        'timestamp': result['timestamp'],
    })


@app.route('/api/files/download/<path:filename>', methods=['GET'])
def download_file(filename):
    if not files_mode_root:
        return jsonify({'error': 'files mode not enabled'}), 400

    if os.path.isfile(files_mode_root):
        if filename != os.path.basename(files_mode_root):
            return jsonify({'error': 'file not found'}), 404
        return send_file(files_mode_root, as_attachment=True, download_name=filename)

    safe_root = os.path.abspath(files_mode_root)
    target_path = os.path.abspath(os.path.join(safe_root, filename))
    if not target_path.startswith(safe_root + os.sep) and target_path != safe_root:
        return jsonify({'error': 'invalid path'}), 400
    if not os.path.isfile(target_path):
        return jsonify({'error': 'file not found'}), 404
    return send_file(target_path, as_attachment=True, download_name=os.path.basename(target_path))


@app.route('/api/pick', methods=['POST'])
def api_pick_item():
    if not service:
        return jsonify({'error': 'service not initialized'}), 500
    
    data = service._load_items_data()
    items = data.get('items', [])
    if not isinstance(items, list) or not items:
        return jsonify({'error': 'no items available'}), 400
    selected = service.pick_random_item(items)
    return jsonify({'item': selected, 'items': items})


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    if not ADMIN_PASSWORD:
        return jsonify({'error': 'admin password not set'}), 500

    data = request.get_json(silent=True) or {}
    password = str(data.get('password', ''))

    if password != ADMIN_PASSWORD:
        return jsonify({'error': 'invalid password'}), 401

    return jsonify({'success': True})


@app.route('/api/admin/codes', methods=['GET'])
def admin_codes():
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    codes_list = [{'code': code, 'used': used} for code, used in service.redeem_codes.items()]
    total = len(codes_list)
    used = sum(1 for c in codes_list if c['used'])
    left = total - used

    return jsonify({
        'codes': codes_list,
        'total_codes': total,
        'used_codes': used,
        'left_codes': left
    })


@app.route('/api/admin/codes/add', methods=['POST'])
def admin_codes_add():
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    data = request.get_json(silent=True) or {}
    code = str(data.get('code', '')).strip().upper()

    if not code:
        return jsonify({'error': '兑换码不能为空'}), 400

    if not all(c.isalnum() for c in code):
        return jsonify({'error': '兑换码只能包含字母和数字'}), 400

    if code in service.redeem_codes:
        return jsonify({'error': '兑换码已存在'}), 400

    service.redeem_codes[code] = False
    try:
        service.add_redeem_code_to_storage(code)
    except Exception:
        pass
    click.echo("[%s] Admin added new redeem code: %s" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), code))

    return jsonify({
        'success': True,
        'code': code,
        'message': '成功新增兑换码: %s' % code
    })


@app.route('/api/admin/codes/gen', methods=['POST'])
def admin_codes_gen():
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    data = request.get_json(silent=True) or {}
    count = data.get('count', None)

    try:
        n = int(count)
    except Exception:
        return jsonify({'error': 'count must be int'}), 400

    if n <= 0:
        return jsonify({'error': 'count must be > 0'}), 400

    if n > 100:
        return jsonify({'error': 'count max is 100'}), 400

    new_codes = []
    try:
        new_codes = service.generate_and_add_redeem_codes_to_storage(n)
    except Exception as e:
        return jsonify({'error': 'failed to generate codes: %s' % e}), 500

    click.echo(
        "[%s] Admin generated redeem codes: requested=%d generated=%d"
        % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), n, len(new_codes))
    )

    return jsonify({
        'success': True,
        'requested': n,
        'generated_count': len(new_codes),
        'generated': new_codes,
    })


@app.route('/api/admin/codes/<code>', methods=['DELETE'])
def admin_codes_delete(code):
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    code = str(code or '').strip().upper()
    if not code:
        return jsonify({'error': 'invalid code'}), 400

    if code not in service.redeem_codes:
        return jsonify({'error': 'code not found'}), 404

    was_used = bool(service.redeem_codes.get(code))

    try:
        del service.redeem_codes[code]
    except Exception:
        pass

    try:
        service.delete_redeem_code_from_storage(code)
    except Exception:
        pass

    try:
        if code in service.code_results:
            del service.code_results[code]
    except Exception:
        pass

    click.echo("[%s] Admin deleted redeem code: %s" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), code))

    return jsonify({'success': True, 'code': code, 'was_used': was_used})


@app.route('/api/admin/codes/clear', methods=['POST'])
def admin_codes_clear():
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    data = request.get_json(silent=True) or {}
    confirm = bool(data.get('confirm'))
    if not confirm:
        return jsonify({'error': 'confirm required'}), 400

    before = len(service.redeem_codes)

    service.redeem_codes = {}
    service.code_results = {}

    try:
        service.clear_redeem_codes_in_storage()
    except Exception:
        pass

    click.echo("[%s] Admin cleared redeem codes: %d" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), before))

    return jsonify({'success': True, 'cleared': before})


@app.route('/api/admin/codes/<code>/reset', methods=['POST'])
def admin_codes_reset(code):
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    code = str(code or '').strip().upper()
    if not code:
        return jsonify({'error': 'invalid code'}), 400

    if code not in service.redeem_codes:
        return jsonify({'error': 'code not found'}), 404

    service.redeem_codes[code] = False

    ok = None
    try:
        ok = service.reset_redeem_code_unused_in_storage(code)
    except Exception:
        ok = None

    try:
        if code in service.code_results:
            del service.code_results[code]
    except Exception:
        pass

    click.echo("[%s] Admin reset redeem code to unused: %s" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), code))

    return jsonify({'success': True, 'code': code, 'storage_reset': bool(ok)})


@app.route('/api/admin/codes/export', methods=['GET'])
def admin_codes_export():
    auth = _require_admin_auth()
    if auth is not None:
        return auth

    only_unused = str(request.args.get('only_unused', '')).strip() == '1'
    fmt = str(request.args.get('format', '')).strip().lower()

    try:
        exported = service.export_redeem_codes_from_storage(only_unused=only_unused)
    except Exception as e:
        return jsonify({'error': 'export failed: %s' % e}), 500

    if fmt == 'text':
        lines = []
        for item in exported:
            c = item.get('code')
            if c:
                lines.append(str(c))
        text = "\n".join(lines)
        return Response(text, mimetype='text/plain; charset=utf-8')

    total = len(exported)
    used = sum(1 for c in exported if c.get('used'))

    return jsonify({
        'codes': exported,
        'total_codes': total,
        'used_codes': used,
        'left_codes': total - used,
    })


def start_web_server(
    port: int,
    no_browser: bool,
    files_root: str | None = None,
    admin_password: str | None = None,
    state_store: Any | None = None,
) -> None:
    global files_mode_root, ADMIN_PASSWORD, service
    ADMIN_PASSWORD = admin_password
    files_mode_root = os.path.abspath(files_root) if files_root else None

    service = PickService(state_store, default_config)

    service.redeem_codes = service.load_redeem_codes_from_storage()
    
    if files_mode_root and not service.redeem_codes:
        try:
            new_codes = service.generate_and_add_redeem_codes_to_storage(5)
            if new_codes:
                click.echo(" Auto-generated %d redeem codes: %s" % (len(new_codes), ", ".join(new_codes)))
        except Exception:
            pass

    private_networks = get_private_networks()
    local_ip = private_networks[0]["ips"][0] if private_networks else "127.0.0.1"
    url_local = f"http://127.0.0.1:{port}"
    url_network = f"http://{local_ip}:{port}"
    click.echo()
    click.echo(f" Local URL: {url_local}")
    click.echo(f" Network URL: {url_network}")
    click.echo(f" Admin URL: {url_network}/admin")
    if files_mode_root:
        click.echo(f" Files root: {files_mode_root}")
    if not no_browser:
        try:
            webbrowser.open(url_network)
            click.echo(" Attempted to open picker page in browser (network URL)")
        except Exception:
            click.echo(" Note: Could not auto-open browser, please visit the URL above")
    click.echo()
    from waitress import serve
    serve(app, host='0.0.0.0', port=port)
