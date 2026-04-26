import json
import os
import re
from datetime import datetime
from typing import Any

from werkzeug.datastructures import FileStorage

from bykcliprelansend.features.files.service import FileShareService


class UploadService:
    def __init__(self, file_service: FileShareService):
        self.file_service = file_service
        self.config = file_service.config

    def verify_password(self, password: str | None):
        if not self.config.upload_password:
            return None
        if not password:
            return R.error("upload password required", 401)
        if password != self.config.upload_password:
            return R.error("wrong password", 401)
        return None

    def ensure_tmp_dir(self) -> str:
        base = self.file_service.ensure_shared_directory()
        tmp_dir = os.path.join(base, ".lansend_upload_tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        return tmp_dir

    @staticmethod
    def safe_upload_id(upload_id: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_-]", "", upload_id or "")

    def init_upload(
        self,
        ip: str,
        filename_raw: str,
        size: int | None,
        rel_path: str,
        chunk_size: int,
        total_chunks: int | None,
    ) -> dict[str, Any]:
        if not filename_raw:
            raise ValueError("filename is required")
        if size is None or size < 0:
            raise ValueError("size is required")
        if total_chunks is None or total_chunks <= 0:
            raise ValueError("total_chunks is required")
        if chunk_size <= 0:
            raise ValueError("invalid chunk_size")

        try:
            target_dir = self.file_service.abs_target_dir(rel_path)
        except ValueError:
            self.file_service.log_upload(ip, 0, "failed (shared directory not set)", rel_path)
            raise
        except PermissionError:
            self.file_service.log_upload(ip, 0, "failed (invalid path)", rel_path)
            raise

        if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
            self.file_service.log_upload(ip, 0, f"failed (target directory missing: {rel_path or 'root'})", rel_path, size)
            raise FileNotFoundError("target directory not found")

        filename = self.file_service.safe_filename(filename_raw) or "untitled"
        final_path, filename, renamed = self.build_target_path(target_dir, filename)

        upload_id = f"{int(datetime.now().timestamp() * 1000)}_{os.getpid()}_{os.urandom(6).hex()}"
        upload_dir = os.path.join(self.ensure_tmp_dir(), upload_id)
        os.makedirs(upload_dir, exist_ok=True)

        meta = {
            "upload_id": upload_id,
            "filename": filename,
            "size": size,
            "rel_path": rel_path,
            "target_dir": target_dir,
            "final_path": final_path,
            "chunk_size": chunk_size,
            "total_chunks": total_chunks,
            "renamed": renamed,
            "created_at": datetime.now().isoformat(),
        }
        with open(os.path.join(upload_dir, "meta.json"), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False)

        return {
            "upload_id": upload_id,
            "chunk_size": chunk_size,
            "total_chunks": total_chunks,
            "filename": filename,
            "renamed": renamed,
        }

    def build_target_path(self, target_dir: str, filename: str) -> tuple[str, str, bool]:
        target_path = os.path.join(target_dir, filename)
        renamed = False
        if os.path.exists(target_path):
            name, ext = os.path.splitext(filename)
            counter = 1
            while os.path.exists(target_path):
                filename = f"{name}_{counter}{ext}"
                target_path = os.path.join(target_dir, filename)
                counter += 1
            renamed = True
        return target_path, filename, renamed

    def chunk_paths(self, upload_id: str) -> tuple[str, str]:
        upload_dir = os.path.join(self.ensure_tmp_dir(), upload_id)
        meta_path = os.path.join(upload_dir, "meta.json")
        return upload_dir, meta_path

    def save_chunk(self, upload_id: str, index: int, stream, ip: str) -> None:
        upload_dir, meta_path = self.chunk_paths(upload_id)
        if not os.path.exists(meta_path):
            raise FileNotFoundError("upload not found")

        chunk_path = os.path.join(upload_dir, f"chunk_{index:08d}.part")
        try:
            with open(chunk_path, "wb") as f:
                while True:
                    buf = stream.read(1024 * 1024)
                    if not buf:
                        break
                    f.write(buf)
        except Exception as e:
            self.file_service.log_upload(ip, 1, f"failed (chunk save failed: {e})")
            raise RuntimeError("failed to save chunk") from e

    def complete_upload(self, upload_id: str, ip: str) -> dict[str, Any]:
        upload_dir, meta_path = self.chunk_paths(upload_id)
        if not os.path.exists(meta_path):
            raise FileNotFoundError("upload not found")

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        total_chunks = int(meta["total_chunks"])
        final_path = meta["final_path"]
        filename = meta["filename"]
        rel_path = meta.get("rel_path", "")
        size = int(meta.get("size") or 0)
        renamed = bool(meta.get("renamed"))

        missing = []
        for i in range(total_chunks):
            path = os.path.join(upload_dir, f"chunk_{i:08d}.part")
            if not os.path.exists(path):
                missing.append(i)
                if len(missing) > 20:
                    break
        if missing:
            raise ValueError(f"missing chunks: {missing[:20]}")

        try:
            os.makedirs(os.path.dirname(final_path), exist_ok=True)
            with open(final_path, "wb") as out:
                for i in range(total_chunks):
                    path = os.path.join(upload_dir, f"chunk_{i:08d}.part")
                    with open(path, "rb") as inp:
                        while True:
                            buf = inp.read(1024 * 1024)
                            if not buf:
                                break
                            out.write(buf)
        except Exception as e:
            self.file_service.log_upload(ip, 1, f"failed (merge failed: {e})", rel_path, size)
            raise RuntimeError("failed to merge file") from e

        self.abort_upload(upload_id)
        self.file_service.log_upload(ip, 1, f"success ({filename})", rel_path, size)
        return {"filename": filename, "renamed": renamed}

    def abort_upload(self, upload_id: str) -> None:
        upload_dir, _ = self.chunk_paths(upload_id)
        if not os.path.exists(upload_dir):
            return
        for root, dirs, files in os.walk(upload_dir, topdown=False):
            for fn in files:
                try:
                    os.remove(os.path.join(root, fn))
                except Exception:
                    pass
            for dn in dirs:
                try:
                    os.rmdir(os.path.join(root, dn))
                except Exception:
                    pass
        try:
            os.rmdir(upload_dir)
        except Exception:
            pass

    def save_file(
        self,
        ip: str,
        file: FileStorage,
        rel_path: str,
        file_size: int | None,
    ) -> dict[str, Any]:
        target_dir = self.file_service.abs_target_dir(rel_path)
        filename = self.file_service.safe_filename(file.filename or "") or "untitled"

        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
        elif not os.path.isdir(target_dir):
            self.file_service.log_upload(ip, 0, f"failed (target directory missing: {rel_path or 'root'})", rel_path, file_size)
            raise FileNotFoundError("target directory not found")

        target_path, filename, renamed = self.build_target_path(target_dir, filename)

        try:
            file.save(target_path)
            self.file_service.log_upload(ip, 1, f"success ({filename})", rel_path, file_size)
            return {"filename": filename, "renamed": renamed}
        except Exception as e:
            self.file_service.log_upload(ip, 1, f"failed (save failed: {e})", rel_path, file_size)
            raise RuntimeError("failed to save file") from e
