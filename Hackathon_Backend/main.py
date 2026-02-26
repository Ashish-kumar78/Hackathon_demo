"""
MindVest Backend - Entry Point & FastAPI Configuration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, learning, investment, prediction, news, advisor

app = FastAPI(
    title="MindVest API",
    description="AI-powered financial advisor backend",
    version="1.0.0",
)

# ── CORS Middleware ─────────────────────────────────────────────────────────
# Allow all origins including file:// protocol (for local HTML file opening)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allow all origins for local development
    allow_credentials=False,      # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(learning.router)
app.include_router(investment.router)
app.include_router(prediction.router)
app.include_router(news.router)
app.include_router(advisor.router)


# ── Health Endpoints ─────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"message": "MindVest API is running 🚀"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
