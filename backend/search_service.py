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


# 제품명이 그 토큰으로 시작할 때 주는 가산점 — 그 토큰이 제품의 주 이름이라는 뜻
PREFIX_BONUS = 1.0


# 토큰별 검색 결과를 합쳐 순위를 매김. 세 가지 신호를 더해 점수를 만든다.
#
# ① 토큰 위치 (주 신호) — 뒤쪽 토큰일수록 높은 점수.
#    한국 제품명은 "브랜드 + 제품명" 순이고 사용자도 그 순서로 검색어를 치기 때문에,
#    뒤 단어일수록 사용자가 실제로 찾는 제품을 특정하는 이름에 가까움.
#      "이너랩 홀드잇" → 홀드잇,  "종근당건강 락토핏" → 락토핏
#
# ② 접두 일치 — 제품명이 그 토큰으로 시작하면 가산점.
#    "홀드잇 MAD 매드", "락토핏 솔루션 스킨"처럼 그 토큰이 제품의 주 이름인 경우
#
# ③ 희소성 (보조) — 적게 걸린 토큰일수록 가산점(검색엔진의 IDF와 같은 발상).
#    토큰이 3개 이상일 때 "골드"처럼 흔한 수식어가 맨 뒤에 와서 ①을 흔드는 것을 눌러줌.
#    단독으로 쓰면 "락토핏 57건 < 종근당건강 19건"처럼 인기 제품군이 거꾸로 밀리므로 보조로만 씀
def _merge_token_results(results: list[dict], tokens: list[str]) -> list[dict]:
    merged: dict[str, dict] = {}
    scores: dict[str, float] = {}
    token_count = len(tokens)

    for index, (token, data) in enumerate(zip(tokens, results)):
        products = data.get("products", [])
        position_weight = (index + 1) / token_count
        # 실제 검색 건수(totalCount)를 희소성 기준으로 씀 — 한 페이지 개수보다 정확함
        total = data.get("totalCount") or len(products)
        rarity = 1 / max(int(total), 1)

        for product in products:
            key = _product_key(product)
            if key not in merged:
                merged[key] = product
                scores[key] = 0.0

            scores[key] += position_weight + rarity
            if (product.get("PRDLST_NM") or "").lstrip().startswith(token):
                scores[key] += PREFIX_BONUS

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
    # 실패한 토큰을 걸러내되, 어느 토큰의 결과인지 짝을 유지해야 접두 일치 점수를 매길 수 있음
    pairs = [(t, r) for t, r in zip(tokens, settled) if isinstance(r, dict)]
    if not pairs:
        return data

    products = _merge_token_results([r for _, r in pairs], [t for t, _ in pairs])
    return {"products": products, "totalCount": len(products)}
