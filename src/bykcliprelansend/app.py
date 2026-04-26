import click

from .cli.launcher import LaunchOptions, run_lansend


@click.command(help="Start a local web server for sharing files over LAN")
@click.option("-p", "--port", default=80, help="Web server port (default: 80)")
@click.option("-d", "--directory", default=".", help="Directory to share (default: current directory)")
@click.option(
    "-ap",
    "--ask-password",
    is_flag=True,
    default=False,
    help="Prompt to set upload password (default: 123456 if confirmed)",
)
@click.option("-nb", "--no-browser", is_flag=True, help="Disable automatic browser opening")
@click.option("-nd", "--hide-download", is_flag=True, default=False, help="Hide download buttons in directory tab")
@click.option("-nu", "--disable-upload", is_flag=True, default=False, help="Disable upload functionality")
@click.option("--chat", is_flag=True, default=False, help="Enable chat functionality")
@click.option("-D", "--daemon", is_flag=True, help="Run server in background after setup")
@click.option(
    "--daemon-password",
    "daemon_password",
    help="Upload password for daemon/background mode (normally omit to be prompted)",
    hidden=True
)
def lansend(
    port: int,
    directory: str,
    ask_password: bool = False,
    no_browser: bool = False,
    hide_download: bool = False,
    disable_upload: bool = False,
    chat: bool = False,
    daemon: bool = False,
    daemon_password=None,
):
    run_lansend(
        LaunchOptions(
            port=port,
            directory=directory,
            ask_password=ask_password,
            no_browser=no_browser,
            hide_download=hide_download,
            disable_upload=disable_upload,
            chat=chat,
            daemon=daemon,
            daemon_password=daemon_password,
        )
    )
