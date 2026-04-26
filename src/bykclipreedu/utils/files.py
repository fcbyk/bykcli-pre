import os


def get_files_metadata(path: str) -> list[dict]:
    if not path or not os.path.exists(path):
        return []

    if os.path.isfile(path):
        return [{
            'name': os.path.basename(path),
            'path': path,
            'size': os.path.getsize(path)
        }]

    files = []
    try:
        for name in sorted(os.listdir(path)):
            full_path = os.path.join(path, name)
            if os.path.isfile(full_path):
                files.append({
                    'name': name,
                    'path': full_path,
                    'size': os.path.getsize(full_path)
                })
    except (FileNotFoundError, PermissionError):
        return []
    return files
