from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health, profiles
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="XLR8Hire Backend",
    description="Phase 1 FastAPI foundation for the XLR8Hire AI reverse hiring marketplace.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(profiles.router)
