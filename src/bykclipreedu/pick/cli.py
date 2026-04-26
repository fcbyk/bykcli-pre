import click
from bykcli.api import start_daemon, CommandContext, pass_command_context, get_private_networks

from ..guard import check_port

from .controller import start_web_server
from ..output import echo_network_urls, copy_to_clipboard

@click.command(name='pick', help='Start web picker server')
@click.option('--port', '-p', default=80, show_default=True, type=int, help='Port for web mode')
@click.option('--no-browser', is_flag=True, help='Do not auto-open browser in web mode')
@click.option('--files','-f', type=click.Path(exists=True, dir_okay=True, file_okay=True, readable=True, resolve_path=True), help='Start web file picker with given file')
@click.option('--password', '-pw', is_flag=True, default=False, help='Prompt to set admin password (default: 123456 if not set)')
@click.option(
    "--daemon-password",
    "daemon_password",
    help="Admin password for daemon/background mode (normally omit to be prompted)",
    hidden=True
)
@click.option('-D', '--daemon', is_flag=True, help='Run web or file picker server in background')
@pass_command_context
def pick(ctx: CommandContext, port, no_browser, files, password, daemon_password, daemon):


    if not check_port(port):
        return

    if files:
        if daemon_password:
            effective_password = daemon_password
        elif password:
            effective_password = click.prompt(
                'Admin password (press Enter to use default: 123456)',
                hide_input=True,
                default='123456',
                show_default=False,
            )
            if not effective_password:
                effective_password = '123456'
        else:
            effective_password = '123456'

        if not daemon:
            start_web_server(
                port=port,
                no_browser=no_browser,
                files_root=files,
                admin_password=effective_password,
                state_store=ctx.state,
            )
            return

        private_networks = get_private_networks()
        local_ip = private_networks[0]["ips"][0] if private_networks else "127.0.0.1"
        
        click.echo()
        click.echo(f" Web File Picker Server")
        echo_network_urls(private_networks, port, include_virtual=True)
        if files:
            click.echo(f" Files root: {files}")
        click.echo(f" Admin URL: http://{local_ip}:{port}/admin")
        copy_to_clipboard(f"http://{local_ip}:{port}")
        click.echo()

        args = [
            '--files',
            files,
            '--port',
            str(port),
        ]
        args.append('--no-browser')
        if effective_password:
            args.extend(['--daemon-password', effective_password])
        start_daemon(ctx.app, 'pick', args)
        return

    if daemon:
        private_networks = get_private_networks()
        local_ip = private_networks[0]["ips"][0] if private_networks else "127.0.0.1"
        
        click.echo()
        click.echo(f" Web Picker Server")
        echo_network_urls(private_networks, port, include_virtual=True)
        click.echo(f" Admin URL: http://{local_ip}:{port}/admin")
        copy_to_clipboard(f"http://{local_ip}:{port}")
        click.echo()

        args = ['--port', str(port)]
        args.append('--no-browser')
        start_daemon(ctx.app, 'pick', args)
        return

    if password:
        admin_password = click.prompt(
            'Admin password (press Enter to use default: 123456)',
            hide_input=True,
            default='123456',
            show_default=False,
        )
        if not admin_password:
            admin_password = '123456'
    else:
        admin_password = '123456'
    
    start_web_server(port, no_browser, admin_password=admin_password, state_store=ctx.state)
