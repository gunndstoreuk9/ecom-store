from fastapi import HTTPException, status


HERO_SKU = "american-sugar-balance-complex"

OFFERS = {
    "one": {"qty": 1, "price_mad": 199, "label": "تجربة 30 يوم"},
    "two": {"qty": 2, "price_mad": 299, "label": "عرض العائلة"},
    "three": {"qty": 3, "price_mad": 349, "label": "عرض 3 عبوات"},
}


def validate_offer(offer_id: str, qty: int, price_mad: int, sku: str) -> dict:
    offer = OFFERS.get(offer_id)
    if not offer or sku != HERO_SKU:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid offer")
    if offer["qty"] != qty or offer["price_mad"] != price_mad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid offer price")
    return offer
