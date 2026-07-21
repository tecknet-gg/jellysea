from pydantic import BaseModel


class RecommendationItem(BaseModel):
    tmdb_id: int
    title: str
    media_type: str  # movie or tv
    overview: str
    poster_path: str | None
    genres: list[str]
    vote_average: float
    popularity: float
    score: float


class RecommendationsResponse(BaseModel):
    recommendations: list[RecommendationItem]
    total: int
