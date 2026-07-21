import random
import httpx
from app.config import settings

TMDB_BASE = "https://api.themoviedb.org/3"

GENRE_CACHE: dict[str, list[dict]] = {}
POPULAR_CACHE: dict[str, list[dict]] = {}


async def _fetch(url: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            url,
            params={**(params or {}), "api_key": settings.tmdb_api_key, "language": "en-US"},
        )
        r.raise_for_status()
        return r.json()


async def _fetch_page(endpoint: str, page: int = 1) -> list[dict]:
    data = await _fetch(f"{TMDB_BASE}/{endpoint}", {"page": page})
    return data.get("results", [])


async def get_popular_movies(pages: int = 2) -> list[dict]:
    cache_key = f"movie_{pages}"
    if cache_key in POPULAR_CACHE:
        return POPULAR_CACHE[cache_key]
    results = []
    for p in range(1, pages + 1):
        results.extend(await _fetch_page("movie/popular", p))
    POPULAR_CACHE[cache_key] = results
    return results


async def get_popular_tv(pages: int = 2) -> list[dict]:
    cache_key = f"tv_{pages}"
    if cache_key in POPULAR_CACHE:
        return POPULAR_CACHE[cache_key]
    results = []
    for p in range(1, pages + 1):
        results.extend(await _fetch_page("tv/popular", p))
    POPULAR_CACHE[cache_key] = results
    return results


async def get_genres(media_type: str) -> list[dict]:
    if media_type in GENRE_CACHE:
        return GENRE_CACHE[media_type]
    data = await _fetch(f"{TMDB_BASE}/genre/{media_type}/list")
    genres = data.get("genres", [])
    GENRE_CACHE[media_type] = genres
    return genres


def normalize(val: float, min_v: float, max_v: float) -> float:
    if max_v - min_v == 0:
        return 0.5
    return (val - min_v) / (max_v - min_v)


def score_item(
    item: dict,
    media_type: str,
    user_genres: set[str] | None,
    pop_min: float,
    pop_max: float,
) -> float:
    popularity = item.get("popularity", 0)
    pop_score = normalize(popularity, pop_min, pop_max)

    genre_ids = item.get("genre_ids", [])
    genre_sim = 0.0
    if user_genres and genre_ids:
        match = sum(1 for g in genre_ids if g in user_genres)
        genre_sim = match / max(len(genre_ids), 1)

    rand_score = random.random()
    recency = 1.0 if item.get("vote_average", 0) >= 6 else 0.5

    return pop_score * 0.35 + genre_sim * 0.35 + rand_score * 0.2 + recency * 0.1


async def get_recommendations(user_id: int | None = None, limit: int = 20) -> list[dict]:
    movies = await get_popular_movies()
    tv = await get_popular_tv()

    genres_movie_map = {g["id"]: g["name"] for g in await get_genres("movie")}
    genres_tv_map = {g["id"]: g["name"] for g in await get_genres("tv")}

    user_genres: set[int] | None = None
    if user_id:
        random.seed(user_id)
        # Mock: pick 1-3 random genres as "user preferences"
        all_genre_ids = list(set(list(genres_movie_map.keys()) + list(genres_tv_map.keys())))
        if all_genre_ids:
            k = min(random.randint(1, 3), len(all_genre_ids))
            user_genres = set(random.sample(all_genre_ids, k))
    else:
        random.seed(42)

    candidates: list[dict] = []
    for m in movies:
        candidates.append({**m, "media_type": "movie"})
    for t in tv:
        candidates.append({**t, "media_type": "tv"})

    if not candidates:
        return []

    pop_values = [c.get("popularity", 0) for c in candidates]
    pop_min, pop_max = min(pop_values), max(pop_values)

    seen: set[tuple[int, str]] = set()
    scored: list[tuple[float, dict]] = []
    for c in candidates:
        key = (c["id"], c["media_type"])
        if key in seen:
            continue
        seen.add(key)
        s = score_item(c, c["media_type"], user_genres, pop_min, pop_max)
        scored.append((s, c))

    scored.sort(key=lambda x: -x[0])

    results = []
    for score, item in scored[:limit]:
        genre_map = genres_movie_map if item["media_type"] == "movie" else genres_tv_map
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title") or item.get("name", "Unknown"),
            "media_type": item["media_type"],
            "overview": item.get("overview", ""),
            "poster_path": f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get("poster_path") else None,
            "genres": [genre_map.get(g, "Unknown") for g in item.get("genre_ids", [])],
            "vote_average": item.get("vote_average", 0),
            "popularity": item.get("popularity", 0),
            "score": round(score, 4),
        })

    return results
