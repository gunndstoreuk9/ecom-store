from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.orders import order_sheet_payload


def test_order_sheet_payload_matches_operations_sheet():
    order = SimpleNamespace(
        public_order_number="TAWAZON10001",
        created_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        customer_name="Fatima",
        phone_e164="+212604752334",
        city="Marrakech",
        hero_qty=3,
        total_mad=349,
        items=[SimpleNamespace(name_ar="المركّب الأمريكي لضبط السكر — الأصلي", qty=3)],
    )

    payload = order_sheet_payload(order)

    assert payload == {
        "DATE": "01/05/2026",
        "SKU": "TOPLUX-BSC-940-60",
        "FULL NAME": "Fatima",
        "PHONE NUMBER": "212604752334",
        "CITY": "Marrakech",
        "QUANTITY": "3",
        "TOTAL PRICE MAD": 349,
        "STATUS": "",
    }
