import re


FAKE_PATTERNS = {
    "0600000000",
    "0611111111",
    "0622222222",
    "0633333333",
    "0644444444",
    "0655555555",
    "0666666666",
    "0677777777",
    "0688888888",
    "0699999999",
    "0700000000",
    "0711111111",
}


def normalize_morocco_phone(input_value: str) -> str:
    digits = re.sub(r"[\s\-().+]", "", input_value)
    if digits.startswith("00212"):
        return "+" + digits[2:]
    if digits.startswith("212") and len(digits) == 12:
        return "+" + digits
    if digits.startswith("0") and len(digits) == 10:
        return "+212" + digits[1:]
    return input_value.strip()


def to_local_morocco_phone(input_value: str) -> str:
    normalized = normalize_morocco_phone(input_value)
    if normalized.startswith("+212") and len(normalized) == 13:
        return "0" + normalized[4:]
    return input_value.strip()


def is_valid_morocco_mobile(input_value: str) -> bool:
    normalized = normalize_morocco_phone(input_value)
    if not re.match(r"^\+212[67]\d{8}$", normalized):
        return False
    return to_local_morocco_phone(normalized) not in FAKE_PATTERNS


def meta_phone_hash_input(input_value: str) -> str:
    return normalize_morocco_phone(input_value).replace("+", "")


def tiktok_phone_hash_input(input_value: str) -> str:
    return normalize_morocco_phone(input_value)
