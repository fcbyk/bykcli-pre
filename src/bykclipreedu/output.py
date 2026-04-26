import click
import random
import time
from typing import Any


def colored_key_value(key: str, value: Any, key_color: str = 'cyan', value_color: str = 'yellow') -> str:
    return f"{click.style(str(key), fg=key_color)}: {click.style(str(value), fg=value_color)}"


def echo_network_urls(networks: list, port: int, include_virtual: bool = False):
    for host in ["localhost", "127.0.0.1"]:
        click.echo(colored_key_value(" Local", f"http://{host}:{port}", key_color=None, value_color="cyan"))

    for net in networks:
        if net['virtual'] and not include_virtual:
            continue

        for ip in net["ips"]:
            if ip == "127.0.0.1":
                continue
            click.echo(colored_key_value(f" [{net['iface']}] Network URL:", f"http://{ip}:{port}", key_color=None, value_color="cyan"))

def copy_to_clipboard(text: str, label: str = "URL", output_prefix: str = " ", silent: bool = False):
    import pyperclip
    import click
    
    try:
        pyperclip.copy(text)
        if not silent:
            click.echo(f"{output_prefix}{label} has been copied to clipboard")
    except Exception:
        if not silent:
            click.echo(f"{output_prefix}Warning: Could not copy {label} to clipboard")


def show_spinning_animation(
    items: list[str],
    iterations: int,
    delay: float,
    prefix: str = "Current pointer: ",
    max_length: int = 0
) -> None:
    if not items:
        return

    if max_length <= 0:
        max_length = max(len(f"{prefix}{item}") for item in items)

    for _ in range(iterations):
        current = random.choice(items)
        display_text = f"{prefix}{current}"
        padding = " " * max(0, max_length - len(display_text))
        click.echo(f"\r{display_text}{padding}", nl=False)
        time.sleep(delay)
