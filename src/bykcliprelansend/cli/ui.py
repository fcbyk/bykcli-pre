import webbrowser
from typing import Any

import click


def echo_network_urls(networks: list[dict[str, Any]], port: int, include_virtual: bool = False) -> None:
    """打印可访问的本地和局域网 URL。"""
    for host in ["localhost", "127.0.0.1"]:
        click.echo(f"{click.style(' Local', fg=None)}: {click.style(f'http://{host}:{port}', fg='cyan')}")

    for net in networks:
        if net["virtual"] and not include_virtual:
            continue

        for ip in net["ips"]:
            if ip == "127.0.0.1":
                continue
            iface = net["iface"]
            click.echo(
                f"{click.style(f' [{iface}] Network URL:', fg=None)}: "
                f"{click.style(f'http://{ip}:{port}', fg='cyan')}"
            )


def copy_to_clipboard(text: str, label: str = "URL", output_prefix: str = " ", silent: bool = False) -> None:
    """将文本复制到剪贴板。"""
    try:
        import pyperclip

        pyperclip.copy(text)
        if not silent:
            click.echo(f"{output_prefix}{label} has been copied to clipboard")
    except Exception:
        if not silent:
            click.echo(f"{output_prefix}Warning: Could not copy {label} to clipboard")


def prompt_upload_password(ask_password: bool, disable_upload: bool) -> str | None:
    """根据命令参数决定是否提示上传密码。"""
    if ask_password and not disable_upload:
        password = click.prompt(
            "Upload password (press Enter to use default: 123456)",
            hide_input=True,
            default="123456",
            show_default=False,
        )
        return password if password else "123456"
    return None


def open_browser(url: str) -> None:
    """在默认浏览器中打开分享页。"""
    webbrowser.open(url)


def print_server_summary(
    shared_directory: str,
    port: int,
    networks: list[dict[str, Any]],
    upload_password_enabled: bool,
) -> str | None:
    """打印启动摘要并返回优先用于打开/复制的 URL。"""
    click.echo()
    click.echo(f" Directory: {shared_directory}")
    if upload_password_enabled:
        click.echo(" Upload Password: Enabled")

    echo_network_urls(networks, port, include_virtual=True)

    local_ip = None
    if networks:
        ips = networks[0].get("ips") or []
        if ips:
            local_ip = ips[0]

    url = f"http://{local_ip}:{port}" if local_ip else f"http://localhost:{port}"
    copy_to_clipboard(url)
    click.echo()
    return url
