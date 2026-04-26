import click
from bykclipreai.cli import ai

def register(cli: click.Group):
    cli.add_command(ai)
