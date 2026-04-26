from dataclasses import dataclass

from bykcli.api import get_command_context, get_private_networks, start_daemon

from bykcliprelansend.bootstrap import start_web_server
from bykcliprelansend.cli.ui import open_browser, print_server_summary, prompt_upload_password
from bykcliprelansend.cli.validators import validate_directory, validate_port
from bykcliprelansend.common.config import LansendConfig
from bykcliprelansend.features.files.service import FileShareService


@dataclass
class LaunchOptions:
    port: int
    directory: str
    ask_password: bool = False
    no_browser: bool = False
    hide_download: bool = False
    disable_upload: bool = False
    chat: bool = False
    daemon: bool = False
    daemon_password: str | None = None


def build_config(options: LaunchOptions) -> LansendConfig | None:
    """构造服务配置，校验失败时返回 None。"""
    shared_directory = validate_directory(options.directory)
    if shared_directory is None:
        return None

    config = LansendConfig(
        shared_directory=shared_directory,
        upload_password=None,
        un_download=options.hide_download,
        un_upload=options.disable_upload,
        chat_enabled=options.chat,
    )
    config.upload_password = options.daemon_password or prompt_upload_password(
        options.ask_password, options.disable_upload
    )
    return config


def build_daemon_args(options: LaunchOptions, config: LansendConfig) -> list[str]:
    """拼装后台守护进程启动参数。"""
    args = ["-p", str(options.port), "-d", config.shared_directory or "."]
    if options.hide_download:
        args.append("--hide-download")
    if options.disable_upload:
        args.append("--disable-upload")
    if options.chat:
        args.append("--chat")
    args.append("--no-browser")
    if config.upload_password:
        args.extend(["--daemon-password", config.upload_password])
    return args


def run_lansend(options: LaunchOptions) -> None:
    """执行 lansend 的启动流程。"""
    config = build_config(options)
    if config is None:
        return

    if not validate_port(options.port):
        return

    networks = get_private_networks()
    url = print_server_summary(
        shared_directory=config.shared_directory or ".",
        port=options.port,
        networks=networks,
        upload_password_enabled=bool(config.upload_password),
    )

    if not options.no_browser and url:
        open_browser(url)

    file_service = FileShareService(config)
    if not options.daemon:
        start_web_server(options.port, file_service)
        return

    context = get_command_context()
    start_daemon(context, "lansend", build_daemon_args(options, config))
