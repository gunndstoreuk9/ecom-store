import time
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.normalized_database_url, pool_pre_ping=True)
    last_error: Optional[Exception] = None

    for attempt in range(1, 31):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database is ready")
            return
        except SQLAlchemyError as exc:
            last_error = exc
            print(f"Waiting for database... attempt {attempt}/30")
            time.sleep(2)

    raise RuntimeError(f"Database was not ready after 60 seconds: {last_error}")


if __name__ == "__main__":
    main()
