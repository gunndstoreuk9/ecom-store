from sqlalchemy.orm import Session

from app.models.order import ConversionEvent, Order


def create_noop_conversion_events(db: Session, order: Order) -> None:
    """Store placeholders so CAPI integrations can be enabled without changing order flow."""
    for platform, event_name in [("meta", "Lead"), ("tiktok", "CompletePayment"), ("google", "conversion")]:
        db.add(
            ConversionEvent(
                order_id=order.id,
                platform=platform,
                event_name=event_name,
                event_id=order.event_id,
                payload_json={"order_id": str(order.id), "value": order.total_mad, "currency": order.currency},
                status="skipped",
                response_json={"reason": "credentials_not_configured"},
                attempt_count=0,
            )
        )
    db.commit()
