import click
from bykcli.api import CommandContext, pass_command_context

from .service import (
    AIService,
    AIServiceError,
    ChatRequest,
    extract_assistant_reply,
)
from . import renderer as ai_renderer

DEFAULT_CONFIG = {
    'model': 'deepseek-chat',
    'api_url': 'https://api.deepseek.com/v1/chat/completions',
    'api_key': None,
    'stream': True,
    'rich': True,
    'extra_body': None,
}

SYSTEM_PROMPT = (
    "You are a helpful assistant. Respond in plain text suitable for a console environment. "
    "Avoid using Markdown, code blocks, or any rich formatting. "
    "Use simple line breaks and spaces for alignment."
)
SYSTEM_PROMPT_RICH = (
    "You are a helpful assistant. Respond using standard Markdown. "
    "Use code blocks for code, bold for emphasis, and lists where appropriate. "
    "Keep your responses concise and suitable for a terminal environment."
)


def _print_streaming_chunks(chunks) -> str:
    reply = ''
    click.secho('AI: ', fg='blue', nl=False, bold=True)
    for chunk in chunks:
        delta = chunk['choices'][0]['delta'].get('content', '')
        if delta:
            click.echo(delta, nl=False)
            reply += delta
    click.echo('')
    return reply


def _chat_loop(ctx: CommandContext):
    config = ctx.state.load()
    if not config:
        config = DEFAULT_CONFIG.copy()
        ctx.state.save(config)
    
    service = AIService()
    system_prompt = SYSTEM_PROMPT_RICH if config.get('rich') else SYSTEM_PROMPT
    messages = [{"role": "system", "content": system_prompt}]

    click.secho('Chat started. Type "exit" to quit.', fg='cyan')

    while True:
        try:
            user_input = input(click.style('You: ', fg='green', bold=True)).strip()
        except (EOFError, KeyboardInterrupt):
            click.secho('\nChat ended.', fg='cyan')
            break

        if user_input.lower() == 'exit':
            break
        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        req = ChatRequest(
            messages=messages,
            model=config['model'],
            api_key=config['api_key'],
            api_url=config['api_url'],
            stream=bool(config['stream']),
            extra_body=config.get('extra_body'),
        )

        try:
            if config.get('rich') and getattr(ai_renderer, 'RICH_AVAILABLE', False):
                if req.stream:
                    resp_or_chunks = service.chat(req)
                    reply = ai_renderer.print_streaming_chunks(resp_or_chunks)
                else:
                    status_text = "[bold blue]正在思考...[/bold blue]"
                    with ai_renderer.Status(status_text, spinner="dots"):
                        resp_or_chunks = service.chat(req)
                    reply = extract_assistant_reply(resp_or_chunks)
                    ai_renderer.render_non_streaming_reply(reply)
            else:
                if (not req.stream) and (not config.get('rich')):
                    click.secho('AI: ', fg='blue', nl=False)
                    click.echo(' 正在思考...', nl=False)
                resp_or_chunks = service.chat(req)

                if req.stream:
                    reply = _print_streaming_chunks(resp_or_chunks)
                else:
                    reply = extract_assistant_reply(resp_or_chunks)
                    click.echo('\r', nl=False)
                    click.secho('AI: ', fg='blue', nl=False)
                    click.echo(f' {reply}')

            messages.append({"role": "assistant", "content": reply})

        except AIServiceError as e:
            click.secho(f'Error: {e}', fg='red')
            messages.pop()
        except Exception as e:
            click.secho(f'Unknown error: {e}', fg='red')
            messages.pop()


@click.command(name='ai', help='use openai api to chat in terminal')
@click.option(
    "--config", "-c",
    is_flag=True,
    default=False,
    help="show config and exit"
)
@click.option('--model', '-m', help='set model')
@click.option('--api-key', '-k', help='set api key')
@click.option('--api-url', '-u', help='set api url (full url)')
@click.option('--stream', '-s', help='set stream, 0 for false, 1 for true')
@click.option('--rich', '-r', help='enable rich rendering, 0 for false, 1 for true')
@click.option('--extra-body', '-e', help='set extra body as JSON string (e.g., \'{"reasoning": {"enabled": true}}\')')
@pass_command_context
def ai(ctx: CommandContext, config, model, api_key, api_url, stream, rich, extra_body):
    state_config = ctx.state.load()
    if not state_config:
        state_config = DEFAULT_CONFIG.copy()
    
    cli_options = {
        'model': model,
        'api_key': api_key,
        'api_url': api_url,
        'stream': stream,
        'rich': rich,
        'extra_body': extra_body,
    }
    
    for key, value in cli_options.items():
        if value is not None:
            if key in ('stream', 'rich'):
                new_val = str(value).lower() in ['1', 'true']
            elif key == 'extra_body':
                import json
                try:
                    new_val = json.loads(value) if isinstance(value, str) else value
                except json.JSONDecodeError:
                    click.secho(f'Warning: Invalid JSON for extra_body: {value}', fg='yellow')
                    continue
            else:
                new_val = value
            
            if state_config.get(key) != new_val:
                state_config[key] = new_val
    
    if config:
        click.secho('AI Configuration:', fg='cyan', bold=True)
        for k, v in state_config.items():
            click.echo(f"  {click.style(k, fg='cyan')}: {click.style(str(v), fg='yellow')}")
        click.echo(f"\nState file: {ctx.state.path}")
        return
    
    has_params = any([model, api_key, api_url, stream, rich, extra_body])
    
    if has_params:
        ctx.state.save(state_config)
        click.secho(f"Config saved.", fg='green')
        click.echo(f"State file: {ctx.state.path}")
        return
    
    if not state_config.get('api_key'):
        click.secho('Error: api_key is not configured. Please set it via --api-key.', fg='red', err=True)
        raise SystemExit(1)
    
    _chat_loop(ctx)
