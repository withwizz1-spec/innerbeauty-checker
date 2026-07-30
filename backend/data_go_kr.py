import os

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

from db import get_cached_search, set_cached_search

load_dotenv()

API_KEY = os.environ["DATA_GO_KR_API_KEY"]

# HACCP 제품이미지 및 포장지표기정보 (한국식품안전관리인증원)
# — 원재료·알레르기유발물질·영양성분·바코드·제품이미지 URL 제공. HACCP 인증 제품만 커버
HACCP_URL = "http://apis.data.go.kr/B553748/CertImgListServiceV3/getCertImgListServiceV3"

# 수입식품 수입신고별 한글표시사항 (식약처)
# — 수입 제품의 한글 제품명·수입업체·제조국·원재료명(IRDNT_NM) 제공
IMPORTED_URL = (
    "http://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingText"
    "/getIprtFoodPrdtKoreanLabelingText"
)

REQUEST_TIMEOUT_SECONDS = 20.0  # httpx 기본(5초)보다 응답이 오래 걸리는 경우 대비


# 공공데이터포털 공통 호출 로직 — 식품안전나라와 응답 구조가 달라서 별도 처리:
# 정상 응답은 {"header": {...}, "body": {"items": [{"item": {...}}, ...]}} 형태고,
# 인증키 오류 등은 JSON이 아닌 XML/텍스트로 내려옴
async def _fetch_items(url: str, params: dict, cache_key: str, page_no: int, num_of_rows: int) -> dict:
    cached = get_cached_search(cache_key, page_no, num_of_rows)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="공공데이터포털 API 응답이 너무 오래 걸려서 중단했어요")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="공공데이터포털 API 호출 실패")

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="공공데이터포털 API 호출 실패")

    try:
        payload = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="공공데이터포털 API 오류 응답")

    # 성공 코드가 기관마다 다름 — 식약처(수입식품)는 "00", 인증원(HACCP)은 "OK"
    header = payload.get("header", {})
    result_code = header.get("resultCode")
    if result_code is not None and result_code not in ("00", "OK"):
        message = header.get("resultMsg") or header.get("resultMessage") or "공공데이터포털 API 오류"
        raise HTTPException(status_code=502, detail=message)

    body = payload.get("body", {})
    # items가 [{"item": {...}}, ...]로 한 겹 싸여 있어서 평탄화
    items = [entry.get("item", entry) for entry in body.get("items") or []]

    data = {"products": items, "totalCount": int(body.get("totalCount") or 0)}
    set_cached_search(cache_key, page_no, num_of_rows, data)
    return data


async def search_haccp_products(keyword: str, page_no: int = 1, num_of_rows: int = 10) -> dict:
    params = {
        "ServiceKey": API_KEY,
        "returnType": "json",
        "pageNo": page_no,
        "numOfRows": num_of_rows,
        "prdlstNm": keyword,
    }
    return await _fetch_items(HACCP_URL, params, f"HACCP:{keyword}", page_no, num_of_rows)


async def search_imported_products(keyword: str, page_no: int = 1, num_of_rows: int = 10) -> dict:
    params = {
        "serviceKey": API_KEY,
        "type": "json",
        "pageNo": page_no,
        "numOfRows": num_of_rows,
        "prductKoreanNm": keyword,
    }
    return await _fetch_items(IMPORTED_URL, params, f"IMPORT:{keyword}", page_no, num_of_rows)
