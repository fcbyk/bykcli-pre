import click
from bykclipreai.cli import ai
from bykcliprelansend.app import lansend
from bykclipreedu import pick, slide


def register(cli: click.Group):
    cli.add_command(ai)
    cli.add_command(lansend)
    cli.add_command(pick)
    cli.add_command(slide)
