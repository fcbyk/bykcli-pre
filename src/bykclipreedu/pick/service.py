import click
import random
from typing import Iterable, Any

from ..utils import files, common
from .. import output


class PickService:

    def __init__(self, state_store: Any, default_config: dict):
        self.state_store = state_store
        self.default_config = default_config

        self.ip_draw_records: dict[str, str] = {}
        self.redeem_codes: dict[str, bool] = {}
        self.ip_file_history: dict[str, set[str]] = {}
        self.code_results: dict[str, dict] = {}

    def reset_state(self):
        self.ip_draw_records = {}
        self.redeem_codes = {}
        self.ip_file_history = {}
        self.code_results = {}

    def list_files(self, files_mode_root: str) -> list[dict]:
        return files.get_files_metadata(files_mode_root)

    def pick_file(self, candidates: list[dict]) -> dict:
        return random.choice(candidates)

    def pick_random_item(self, items: list[str]) -> str:
        return random.choice(items)

    def generate_redeem_codes(self, count: int, length: int = 4) -> Iterable[str]:
        codes = set()
        while len(codes) < count:
            codes.add(common.generate_random_string(length))
        return sorted(codes)

    def _load_redeem_codes_data(self) -> dict:
        if not self.state_store:
            return {'codes': {}}
        
        data = self.state_store.load()
        if not isinstance(data, dict):
            return {'codes': {}}
        
        codes_data = data.get('redeem_codes', {'codes': {}})
        if not isinstance(codes_data, dict):
            codes_data = {'codes': {}}
        if not isinstance(codes_data.get('codes'), dict):
            codes_data['codes'] = {}
        return codes_data

    def _save_redeem_codes_data(self, data: dict) -> None:
        if not self.state_store:
            return
        
        full_data = self.state_store.load()
        if not isinstance(full_data, dict):
            full_data = {}
        
        full_data['redeem_codes'] = data
        
        self.state_store.save(full_data)

    def load_redeem_codes_from_storage(self) -> dict[str, bool]:
        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        out = {}
        for k, v in codes.items():
            code = str(k).strip().upper()
            if not code:
                continue
            used = False
            if isinstance(v, dict):
                used = bool(v.get('used'))
            elif isinstance(v, bool):
                used = bool(v)
            out[code] = used
        return out

    def export_redeem_codes_from_storage(self, only_unused: bool = False) -> list[dict]:
        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        out = []
        if isinstance(codes, dict):
            for k, v in sorted(codes.items()):
                code = str(k).strip().upper()
                if not code:
                    continue
                used = False
                if isinstance(v, dict):
                    used = bool(v.get('used'))
                elif isinstance(v, bool):
                    used = bool(v)

                if only_unused and used:
                    continue

                out.append({'code': code, 'used': used})
        return out

    def add_redeem_code_to_storage(self, code: str) -> bool:
        code = str(code or '').strip().upper()
        if not code:
            return False

        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        if code in codes:
            return False
        codes[code] = {'used': False}
        data['codes'] = codes
        self._save_redeem_codes_data(data)
        return True

    def delete_redeem_code_from_storage(self, code: str) -> bool | None:
        code = str(code or '').strip().upper()
        if not code:
            return None

        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        if code not in codes:
            return False

        try:
            del codes[code]
        except Exception:
            return False

        data['codes'] = codes
        self._save_redeem_codes_data(data)
        return True

    def clear_redeem_codes_in_storage(self) -> int:
        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        n = len(codes) if isinstance(codes, dict) else 0
        data['codes'] = {}
        self._save_redeem_codes_data(data)
        return n

    def reset_redeem_code_unused_in_storage(self, code: str) -> bool | None:
        code = str(code or '').strip().upper()
        if not code:
            return None

        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        if code not in codes:
            return False

        v = codes.get(code)
        used = False
        if isinstance(v, dict):
            used = bool(v.get('used'))
        elif isinstance(v, bool):
            used = bool(v)

        if not used:
            return False

        codes[code] = {'used': False}
        data['codes'] = codes
        self._save_redeem_codes_data(data)
        return True

    def mark_redeem_code_used_in_storage(self, code: str) -> bool:
        code = str(code or '').strip().upper()
        if not code:
            return False

        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        if code not in codes:
            return False

        v = codes.get(code)
        if isinstance(v, dict):
            if v.get('used'):
                return False
            v['used'] = True
            codes[code] = v
        elif isinstance(v, bool):
            if v:
                return False
            codes[code] = True
        else:
            codes[code] = {'used': True}

        data['codes'] = codes
        self._save_redeem_codes_data(data)
        return True

    def generate_and_add_redeem_codes_to_storage(self, count: int, length: int = 4) -> list[str]:
        try:
            n = int(count)
        except Exception:
            return []
        if n <= 0:
            return []

        data = self._load_redeem_codes_data()
        codes = data.get('codes', {})
        if not isinstance(codes, dict):
            codes = {}

        existed = set([str(k).strip().upper() for k in codes.keys() if str(k).strip()])

        new_codes = []
        tries = 0
        max_tries = max(100, n * 50)
        extra = 0
        cur_len = int(length) if int(length) > 0 else 4

        while len(new_codes) < n and tries < max_tries:
            tries += 1
            code = common.generate_random_string(cur_len)
            if not code or code in existed:
                extra += 1
                if extra >= 20:
                    extra = 0
                    cur_len = min(cur_len + 1, 16)
                continue
            existed.add(code)
            new_codes.append(code)
            codes[code] = {'used': False}

        data['codes'] = codes
        self._save_redeem_codes_data(data)

        for c in new_codes:
            self.redeem_codes[c] = False

        return new_codes

    def pick_item(self, items: list[str]):
        if not items:
            click.echo("Error: No items available. Please use --add to add items first")
            return

        click.echo("=== Random Pick ===")
        click.echo("Spinning...")

        max_length = max(len(f"Current pointer: {item}") for item in items) if items else 0

        output.show_spinning_animation(items, random.randint(100, 200), 0.05, max_length=max_length)
        output.show_spinning_animation(items, random.randint(20, 40), 0.3, max_length=max_length)
        output.show_spinning_animation(items, random.randint(3, 10), 0.7, max_length=max_length)

        click.echo("\nPick finished!")

    def _load_items_data(self) -> dict:
        if not self.state_store:
            return {'items': []}
        
        data = self.state_store.load()
        if not isinstance(data, dict):
            return {'items': []}
        
        items_data = data.get('items', self.default_config or {'items': []})
        if not isinstance(items_data, dict):
            items_data = {'items': []}
        if 'items' not in items_data or not isinstance(items_data.get('items'), list):
            items_data['items'] = []
        return items_data

    def _save_items_data(self, data: dict) -> None:
        if not self.state_store:
            return
        
        full_data = self.state_store.load()
        if not isinstance(full_data, dict):
            full_data = {}
        
        full_data['items'] = data
        
        self.state_store.save(full_data)

    def add_item(self, item: str) -> bool:
        if not item or not item.strip():
            return False
            
        item = item.strip()
        data = self._load_items_data()
        items = data.get('items', [])
        
        if item in items:
            return False
            
        items.append(item)
        data['items'] = items
        self._save_items_data(data)
        return True

    def add_items(self, items: list[str]) -> list[str]:
        duplicates = []
        data = self._load_items_data()
        existing_items = set(data.get('items', []))
        
        new_items = []
        for item in items:
            if not item or not item.strip():
                continue
            item = item.strip()
            if item in existing_items:
                duplicates.append(item)
            else:
                new_items.append(item)
                existing_items.add(item)
        
        if new_items:
            data['items'].extend(new_items)
            self._save_items_data(data)
        
        return duplicates

    def remove_item(self, item: str) -> bool:
        if not item or not item.strip():
            return False
            
        item = item.strip()
        data = self._load_items_data()
        items = data.get('items', [])
        
        if item not in items:
            return False
            
        items.remove(item)
        data['items'] = items
        self._save_items_data(data)
        return True

    def clear_items(self) -> int:
        data = self._load_items_data()
        count = len(data.get('items', []))
        data['items'] = []
        self._save_items_data(data)
        return count

    def update_items(self, items: list[str]) -> None:
        data = self._load_items_data()
        data['items'] = [item.strip() for item in items if item and item.strip()]
        self._save_items_data(data)
