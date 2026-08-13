import asyncio
import os
import urllib.parse

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

# 검색어를 단어별로 쪼개 재시도할 때 쓰는 제한 — 외부 API가 느려서 호출 수를 묶어둠
MAX_FALLBACK_TOKENS = 3
MIN_TOKEN_LENGTH = 2


# 식품안전나라는 API 자체 오류도 HTTP 200으로 응답하고, 본문 안의 RESULT.CODE로
# 알려줌 (예: "ERROR-500"). 이걸 놓치면 "결과 0건"으로 오인해서 잘못 캐싱하게 됨
def parse_service_result(response_body: dict, service_id: str = SERVICE_ID) -> dict:
    result = response_body.get(service_id, {})
    code = result.get("RESULT", {}).get("CODE", "")
    if code.startswith("ERROR"):
        message = result.get("RESULT", {}).get("MSG", "식품안전나라 API 오류")
        raise HTTPException(status_code=502, detail=message)
    return result


# 검색어 하나를 그대로 식품안전나라에 조회 (캐시 read/write 포함)
async def _search_single(keyword: str, start_idx: int, end_idx: int, service_id: str) -> dict:
    # 같은 검색어라도 서비스(C003/C002)마다 결과가 다르므로 캐시 키를 서비스별로 분리
    cache_key = f"{service_id}:{keyword}"
    cached = get_cached_search(cache_key, start_idx, end_idx)
    if cached is not None:
        return cached

    quoted = urllib.parse.quote(keyword, safe="")
    url = f"{BASE_URL}/{API_KEY}/{service_id}/json/{start_idx}/{end_idx}/PRDLST_NM={quoted}"

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


# "이너랩 홀드잇"처럼 붙여 쓴 검색어를 단어 단위로 분해
# 식약처는 제품명 전체를 통째로 대조해서, 쇼핑몰에 보이는 "브랜드명 + 제품명"을 그대로 넣으면 0건이 남
def _tokenize(keyword: str) -> list[str]:
    seen = []
    for token in keyword.split():
        if len(token) >= MIN_TOKEN_LENGTH and token not in seen:
            seen.append(token)
    return seen[:MAX_FALLBACK_TOKENS]


def _product_key(product: dict) -> str:
    # 신고번호가 없는 응답도 있어서 제품명+업소명으로 키를 보강
    return product.get("PRDLST_REPORT_NO") or f"{product.get('PRDLST_NM')}|{product.get('BSSH_NM')}"


# 토큰별 검색 결과를 합쳐 순위를 매김.
#
# 단순히 "몇 개 토큰에 걸렸나"로만 세면, 두 토큰을 다 가진 제품이 없을 때 전부 동점이 되어
# 결국 앞 단어가 이김. "이너랩 홀드잇"에서 정작 찾던 홀드잇 제품이 이너랩 제품들 뒤로 밀렸던 이유.
#
# 그래서 적게 걸린 토큰일수록 높은 가중치를 줌 — 검색 결과가 적은 단어일수록
# 그 검색을 특징짓는 단어이기 때문(검색엔진의 IDF와 같은 발상).
#   이너랩 6건 → 가중치 1/6,  홀드잇 2건 → 가중치 1/2  ⇒ 홀드잇 제품이 위로
def _merge_token_results(results: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    scores: dict[str, float] = {}

    for data in results:
        products = data.get("products", [])
        # 실제 검색 건수(totalCount)를 희소성 기준으로 씀 — 한 페이지 개수보다 정확함
        total = data.get("totalCount") or len(products)
        weight = 1 / max(int(total), 1)

        for product in products:
            key = _product_key(product)
            if key not in merged:
                merged[key] = product
                scores[key] = 0.0
            scores[key] += weight

    # 점수가 같으면 원래 순서를 유지 (파이썬 sort는 안정 정렬)
    return sorted(merged.values(), key=lambda p: -scores[_product_key(p)])


# /api/search(C003)·/api/search/general(C002) 라우트와 백그라운드 동기화 잡이 공통으로 쓰는 검색 로직
async def search_products(
    keyword: str, start_idx: int = 1, end_idx: int = 10, service_id: str = SERVICE_ID
) -> dict:
    data = await _search_single(keyword, start_idx, end_idx, service_id)
    if data["products"]:
        return data

    # 0건이면 단어별로 쪼개 재시도 — 외부 API가 느리므로 토큰들을 병렬로 조회
    tokens = _tokenize(keyword)
    if len(tokens) < 2:
        return data

    settled = await asyncio.gather(
        *(_search_single(t, start_idx, end_idx, service_id) for t in tokens),
        return_exceptions=True,  # 한 토큰이 실패해도 나머지 결과는 살림
    )
    succeeded = [r for r in settled if isinstance(r, dict)]
    if not succeeded:
        return data

    products = _merge_token_results(succeeded)
    return {"products": products, "totalCount": len(products)}
