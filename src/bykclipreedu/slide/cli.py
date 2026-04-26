import click
from bykcli.api import start_daemon, get_private_networks, CommandContext, pass_command_context

from ..guard import check_port

from .service import SlideService
from .controller import create_slide_app
from ..output import echo_network_urls, copy_to_clipboard


@click.command(name="slide", help="Start PPT remote control server, control slides via mobile web page")
@click.option(
    "-p",
    "--port",
    default=80,
    help="Web server port (default: 80)",
)
@click.option(
    "-D",
    "--daemon",
    is_flag=True,
    help="Run server in background after setup",
)
@click.option(
    "--daemon-password",
    "password",
    help="Access password for daemon/background mode (normally omit to be prompted)",
    hidden=True
)
@pass_command_context
def slide(ctx: CommandContext, port, daemon, password):

    if not password:
        while True:
            password = click.prompt(
                "Please set access password",
                hide_input=True,
                confirmation_prompt=True,
            )
            if password:
                break
            click.echo(" Error: Password cannot be empty")

    if not check_port(port):
        return

    click.echo()

    service = SlideService(password)

    app, socketio = create_slide_app(service)
    
    private_networks = get_private_networks()
    local_ip = private_networks[0]["ips"][0]
        
    click.echo(f" PPT Remote Control Server")
    echo_network_urls(private_networks, port, include_virtual=True)
    click.echo(f" Open the URL above on your mobile device to control")

    copy_to_clipboard(f"http://{local_ip}:{port}")
    
    click.echo()

    if not daemon:
        socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
        return

    args = ["--port", str(port), "--daemon-password", password]
    start_daemon(ctx.app, "slide", args)
