import os

import click
from bykcli.api import ensure_port_available


def validate_directory(directory: str) -> str | None:
    """验证并返回绝对路径形式的共享目录。"""
    if not os.path.exists(directory):
        click.echo(f"Error: Directory {directory} does not exist")
        return None

    if not os.path.isdir(directory):
        click.echo(f"Error: {directory} is not a directory")
        return None

    return os.path.abspath(directory)


def validate_port(port: int) -> bool:
    """检查端口是否可用。"""
    try:
        ensure_port_available(port)
        return True
    except OSError:
        click.echo(f"Error: Port {port} is already in use")
        return False
