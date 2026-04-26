import click
from bykclipreai.cli import ai
from bykcliprelansend.app import lansend

def register(cli: click.Group):
    cli.add_command(ai)
    cli.add_command(lansend)
