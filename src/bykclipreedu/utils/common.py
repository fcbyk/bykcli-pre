import random
import string


def generate_random_string(
    length: int = 4,
    charset: str | None = string.ascii_uppercase + string.digits
) -> str:
    return "".join(random.choice(charset) for _ in range(length))
