import os
import re
from datetime import datetime
from typing import Any

from bykcliprelansend.common.config import LansendConfig


class FileShareService:
    """Core file-sharing business logic."""

    def __init__(self, config: LansendConfig):
        self.config = config

    @staticmethod
    def safe_filename(filename: str) -> str:
        return re.sub(r"[^\w\s\u4e00-\u9fff\-\.]", "", filename)

    @staticmethod
    def is_image_file(filename: str) -> bool:
        image_extensions = {
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico", ".tiff", ".tif",
        }
        ext = os.path.splitext(filename)[1].lower()
        return ext in image_extensions

    @staticmethod
    def is_video_file(filename: str) -> bool:
        video_extensions = {
            ".mp4", ".webm", ".ogg", ".mov", ".mkv", ".avi", ".m4v",
        }
        ext = os.path.splitext(filename)[1].lower()
        return ext in video_extensions

    @staticmethod
    def format_size(num_bytes: int | None) -> str:
        if num_bytes is None:
            return "unknown size"
        units = ["B", "KB", "MB", "GB", "TB"]
        size = float(num_bytes)
        for unit in units:
            if size < 1024 or unit == units[-1]:
                return f"{size:.2f} {unit}" if unit != "B" else f"{int(size)} {unit}"
            size /= 1024
        return f"{size:.2f} {units[-1]}"

    @staticmethod
    def get_path_parts(current_path: str) -> list[dict[str, str]]:
        parts: list[dict[str, str]] = []
        if current_path:
            current = ""
            for part in current_path.split("/"):
                if part:
                    current = f"{current}/{part}" if current else part
                    parts.append({"name": part, "path": current})
        return parts

    def log_upload(
        self,
        ip: str,
        file_count: int,
        status: str,
        rel_path: str = "",
        file_size: int | None = None,
    ) -> None:
        import sys

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        path_str = f"/{rel_path}" if rel_path else "/"
        size_str = self.format_size(file_size) if file_size is not None else "unknown size"
        log_msg = f" [{ts}] {ip} upload {file_count} file(s), status: {status}, path: {path_str}, size: {size_str}\n"
        sys.stderr.write(log_msg)
        sys.stderr.flush()

    def ensure_shared_directory(self) -> str:
        if not self.config.shared_directory:
            raise ValueError("shared directory not set")
        return self.config.shared_directory

    def abs_target_dir(self, rel_path: str) -> str:
        base = self.ensure_shared_directory()
        rel_path = (rel_path or "").strip("/")
        target_dir = os.path.abspath(os.path.join(base, rel_path))
        base_abs = os.path.abspath(base)
        if not target_dir.startswith(base_abs):
            raise PermissionError("invalid path")
        return target_dir

    def get_file_tree(self, base_path: str, relative_path: str = "") -> list[dict[str, Any]]:
        current_path = os.path.join(base_path, relative_path) if relative_path else base_path
        items: list[dict[str, Any]] = []
        if not os.path.exists(current_path) or not os.path.isdir(current_path):
            return items

        for name in os.listdir(current_path):
            full_path = os.path.join(current_path, name)
            item_path = os.path.join(relative_path, name) if relative_path else name
            item: dict[str, Any] = {
                "name": name,
                "path": item_path.replace("\\", "/"),
                "is_dir": os.path.isdir(full_path),
            }
            if item["is_dir"]:
                item["children"] = self.get_file_tree(base_path, item_path)
            items.append(item)

        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return items

    def get_directory_listing(self, relative_path: str = "") -> dict[str, Any]:
        base = self.ensure_shared_directory()
        relative_path = (relative_path or "").strip("/")
        current_path = os.path.join(base, relative_path) if relative_path else base

        if not os.path.exists(current_path) or not os.path.isdir(current_path):
            raise FileNotFoundError("Directory not found")

        items: list[dict[str, Any]] = []
        for name in os.listdir(current_path):
            full_path = os.path.join(current_path, name)
            item_path = os.path.join(relative_path, name) if relative_path else name
            items.append({
                "name": name,
                "path": item_path.replace("\\", "/"),
                "is_dir": os.path.isdir(full_path),
            })
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

        share_name = os.path.basename(base) or base.rstrip(os.sep) or base
        return {
            "share_name": share_name,
            "relative_path": relative_path,
            "path_parts": self.get_path_parts(relative_path),
            "items": items,
            "require_password": bool(self.config.upload_password),
        }

    def resolve_file_path(self, filename: str) -> str:
        base = self.ensure_shared_directory()
        normalized_path = (filename or "").replace("/", os.sep)
        file_path = os.path.abspath(os.path.join(base, normalized_path))
        if not file_path.startswith(os.path.abspath(base)):
            raise PermissionError("Invalid path")
        return file_path

    def read_file_content(self, relative_path: str) -> dict[str, Any]:
        file_path = self.resolve_file_path(relative_path)

        if not os.path.exists(file_path) or os.path.isdir(file_path):
            raise FileNotFoundError("File not found")

        raw_name = os.path.basename(relative_path)
        lower_name = raw_name.lower()

        if self.is_image_file(lower_name):
            return {
                "is_image": True,
                "path": relative_path,
                "name": raw_name,
            }

        if self.is_video_file(lower_name):
            return {
                "is_video": True,
                "path": relative_path,
                "name": raw_name,
            }

        max_preview_bytes = 2 * 1024 * 1024
        try:
            file_size = os.path.getsize(file_path)
            if file_size > max_preview_bytes:
                return {
                    "is_binary": True,
                    "path": relative_path,
                    "name": raw_name,
                    "error": "文件过大，超过 2MB，建议在浏览器打开",
                }

            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read(max_preview_bytes + 1)

            if len(content) > max_preview_bytes:
                return {
                    "is_binary": True,
                    "path": relative_path,
                    "name": raw_name,
                    "error": "文件过大，超过 2MB，建议在浏览器打开",
                }

            return {
                "content": content,
                "path": relative_path,
                "name": raw_name,
            }
        except UnicodeDecodeError:
            return {
                "is_binary": True,
                "path": relative_path,
                "name": raw_name,
                "error": "二进制文件无法预览，建议在浏览器打开",
            }
