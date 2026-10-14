from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import Base, engine
from app import models  # noqa
from app.routers import pages, auth_routes, chat_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="WEBWAVE API",
    description="Smart Part-Time Job Platform with AI Chatbot",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["Chat"])
app.include_router(pages.router, tags=["Pages"])

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "app": "WEBWAVE", "version": "1.0.0"}