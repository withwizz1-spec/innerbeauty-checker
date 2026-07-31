import os

import httpx
from dotenv import load_dotenv

from db import get_cached_search, set_cached_search

load_dotenv()

CLIENT_ID = os.environ["NAVER_CLIENT_ID"]
CLIENT_SECRET = os.environ["NAVER_CLIENT_SECRET"]

SHOP_URL = "https://openapi.naver.com/v1/search/shop.json"

# 이미지 보강은 부가 기능이라 짧게 — 느려도 검색 자체를 늦추면 안 됨
REQUEST_TIMEOUT_SECONDS = 5.0


# 네이버쇼핑에서 제품 이미지를 찾아옴. 실패해도 절대 예외를 던지지 않고
# {"image_url": None}으로 degrade — C003 등 이미지 소스가 없는 제품을 위한 보조 기능일 뿐,
# 이게 실패한다고 검색 결과 자체가 안 보이면 안 됨
async def search_product_image(query: str) -> dict:
    cache_key = f"NAVER:{query}"
    cached = get_cached_search(cache_key, 1, 1)
    if cached is not None:
        return cached

    headers = {"X-Naver-Client-Id": CLIENT_ID, "X-Naver-Client-Secret": CLIENT_SECRET}
    params = {"query": query, "display": 1}

    image_url = None
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(SHOP_URL, headers=headers, params=params)
        if response.status_code == 200:
            items = response.json().get("items") or []
            if items:
                image_url = items[0].get("image") or None
    except (httpx.TimeoutException, httpx.RequestError, ValueError):
        image_url = None

    data = {"image_url": image_url}
    set_cached_search(cache_key, 1, 1, data)  # miss도 캐싱해 같은 검색어 반복 조회 방지
    return data
