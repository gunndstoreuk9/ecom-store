import pytest
from fastapi import HTTPException

from app.services.money import validate_offer


def test_validate_locked_offer_price():
    offer = validate_offer("three", 3, 349, "american-sugar-balance-complex")
    assert offer["price_mad"] == 349


def test_reject_client_price_tampering():
    with pytest.raises(HTTPException):
        validate_offer("three", 3, 1, "american-sugar-balance-complex")
