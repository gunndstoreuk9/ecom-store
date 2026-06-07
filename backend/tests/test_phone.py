from app.services.phone import (
    is_valid_morocco_mobile,
    meta_phone_hash_input,
    normalize_morocco_phone,
    tiktok_phone_hash_input,
    to_local_morocco_phone,
)


def test_valid_morocco_phone_formats():
    assert normalize_morocco_phone("0612345678") == "+212612345678"
    assert normalize_morocco_phone("212612345678") == "+212612345678"
    assert normalize_morocco_phone("+212 6 12 34 56 78") == "+212612345678"
    assert to_local_morocco_phone("+212612345678") == "0612345678"
    assert is_valid_morocco_mobile("0612345678")


def test_reject_fake_or_foreign_numbers():
    assert not is_valid_morocco_mobile("0600000000")
    assert not is_valid_morocco_mobile("+33123456789")


def test_hash_inputs():
    assert meta_phone_hash_input("+212612345678") == "212612345678"
    assert tiktok_phone_hash_input("0612345678") == "+212612345678"
