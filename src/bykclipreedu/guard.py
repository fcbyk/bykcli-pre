import click
from bykcli.api import ensure_port_available


def check_port(port: int, host: str = "0.0.0.0", output_prefix: str = " ", silent: bool = False) -> bool:
    try:
        ensure_port_available(port=port, host=host)
    except OSError as e:
        if not silent:
            click.echo(
                f"{output_prefix}Error: Port {port} is already in use (or you don't have permission). "
                f"{output_prefix}Please choose another port (e.g. --port {int(port) + 1})."
            )
            click.echo(f"{output_prefix}Details: {e}\n")
        return False
    return True
