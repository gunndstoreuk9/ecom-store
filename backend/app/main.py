from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.admin import router as admin_router
from app.api.routes.digylog import router as digylog_router
from app.api.routes.health import router as health_router
from app.api.routes.orders import router as orders_router
from app.api.routes.tracking import router as tracking_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Tawazon Health API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/v1")
app.include_router(orders_router, prefix="/v1")
app.include_router(admin_router, prefix="/v1")
app.include_router(tracking_router, prefix="/v1")
app.include_router(digylog_router, prefix="/v1")


@app.get("/")
def root() -> dict:
    return {"ok": True, "service": "tawazon-backend"}
