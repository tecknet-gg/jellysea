from fastapi import FastAPI, Query
from app.schemas import RecommendationsResponse
from app.engine import get_recommendations

app = FastAPI(title="Simplemendarr", version="0.1.0")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "simplemendarr"}


@app.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(
    user_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    items = await get_recommendations(user_id=user_id, limit=limit)
    return RecommendationsResponse(recommendations=items, total=len(items))
