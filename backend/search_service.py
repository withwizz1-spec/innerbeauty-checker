import os

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

from db import get_cached_search, set_cached_search

load_dotenv()

API_KEY = os.environ["FOOD_SAFETY_API_KEY"]
SERVICE_ID = "C003"          # 건강기능식품 품목제조신고
GENERAL_SERVICE_ID = "C002"  # 일반 가공식품 품목제조보고 — 건강보조식품 원료 fallback용
BASE_URL = "https://openapi.foodsafetykorea.go.kr/api"

# 식품안전나라 응답이 10초 넘게 걸리는 경우가 실제로 있어서(httpx 기본 5초보다 길게 잡음),
# 기본 타임아웃을 쓰면 실제로는 살아있는 API인데도 타임아웃으로 죽어버림
REQUEST_TIMEOUT_SECONDS = 20.0


# 식품안전나라는 API 자체 오류도 HTTP 200으로 응답하고, 본문 안의 RESULT.CODE로
# 알려줌 (예: "ERROR-500"). 이걸 놓치면 "결과 0건"으로 오인해서 잘못 캐싱하게 됨
def parse_service_result(response_body: dict, service_id: str = SERVICE_ID) -> dict:
    result = response_body.get(service_id, {})
    code = result.get("RESULT", {}).get("CODE", "")
    if code.startswith("ERROR"):
        message = result.get("RESULT", {}).get("MSG", "식품안전나라 API 오류")
        raise HTTPException(status_code=502, detail=message)
    return result


# /api/search(C003)·/api/search/general(C002) 라우트와 백그라운드 동기화 잡이 공통으로 쓰는 검색 로직
async def search_products(
    keyword: str, start_idx: int = 1, end_idx: int = 10, service_id: str = SERVICE_ID
) -> dict:
    # 같은 검색어라도 서비스(C003/C002)마다 결과가 다르므로 캐시 키를 서비스별로 분리
    cache_key = f"{service_id}:{keyword}"
    cached = get_cached_search(cache_key, start_idx, end_idx)
    if cached is not None:
        return cached

    url = f"{BASE_URL}/{API_KEY}/{service_id}/json/{start_idx}/{end_idx}/PRDLST_NM={keyword}"

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="식품안전나라 API 응답이 너무 오래 걸려서 중단했어요")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="식품안전나라 API 호출 실패")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="식품안전나라 API 호출 실패")

    try:
        body = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="식품안전나라 API 오류 응답")

    result = parse_service_result(body, service_id)

    data = {
        "products": result.get("row", []),
        "totalCount": int(result.get("total_count", 0)),
    }
    set_cached_search(cache_key, start_idx, end_idx, data)
    return data
