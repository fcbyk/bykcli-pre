from dataclasses import dataclass


@dataclass
class LansendConfig:
    shared_directory: str | None = None
    upload_password: str | None = None
    un_download: bool = False
    un_upload: bool = False
    chat_enabled: bool = False
