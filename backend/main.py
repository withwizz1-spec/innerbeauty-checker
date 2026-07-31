import os
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import (
    AuthError,
    create_token,
    create_user,
    get_user_info,
    init_auth_db,
    set_allergies,
    set_health_mode,
    verify_login,
    verify_token,
)
from data_go_kr import search_haccp_products, search_imported_products
from db import init_db
from ingredients import add_report, get_all_categories, init_ingredients_db
from interactions import get_all_interactions, init_interactions_db
from mode_warnings import get_mode_warnings, init_mode_warnings_db
from naver import search_product_image
from scheduler import get_sync_history, init_sync_log_db, start_scheduler, stop_scheduler
from search_service import (
    API_KEY,
    BASE_URL,
    GENERAL_SERVICE_ID,
    SERVICE_ID,
    parse_service_result,
    search_products,
)

init_db()
init_ingredients_db()
init_interactions_db()
init_auth_db()
init_mode_warnings_db()
init_sync_log_db()


# 서버가 실제로 요청을 받기 시작할 때(startup) 스케줄러를 켜고,
# 서버가 종료될 때(shutdown) 정리함 — yield 이전은 시작 시, 이후는 종료 시 실행됨
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="InnerBeauty Checker API",
    description="건강기능식품 검색 · 성분 안전성 분석을 위한 백엔드 API",
    version="0.1.0",
    lifespan=lifespan,
)

# 로컬 개발 중인 프론트엔드(Vite)에서의 요청은 allow_origin_regex로, 배포된 Vercel 프론트는
# allow_origins(FRONTEND_URL)로 각각 허용. CORSMiddleware는 둘 중 하나라도 만족하면 통과시킴.
# 포트를 고정하지 않는 이유: 5173이 이미 사용 중이면 Vite가 5174, 5175...로 자동으로 옮겨가는데,
# 그때마다 여기 포트를 맞춰줘야 했던 문제가 있었음(회원가입 등 모든 API가 CORS로 막힘)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_origins=[os.environ.get("FRONTEND_URL", "")],
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)


# Authorization: Bearer <token> 헤더에서 토큰을 꺼내 유효성을 검증하고 user_id를 반환
# 라우트 함수 인자에 `user_id: int = Depends(get_current_user_id)`로 붙이면 자동 실행됨
def get_current_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요해요")

    token = authorization.removeprefix("Bearer ")
    try:
        return verify_token(token)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/search", tags=["검색"], summary="제품명으로 건강기능식품 검색")
async def search(keyword: str, start_idx: int = 1, end_idx: int = 10):
    """식품안전나라 C003 서비스를 프록시 호출하며, 1시간 TTL로 결과를 캐싱합니다."""
    return await search_products(keyword, start_idx, end_idx)


@app.get("/api/search/haccp", tags=["검색"], summary="제품명으로 HACCP 인증 제품 검색")
async def search_haccp(keyword: str, page_no: int = 1, num_of_rows: int = 10):
    """공공데이터포털 HACCP 제품정보를 조회합니다. 원재료·알레르기·영양성분·제품이미지 URL을 포함합니다."""
    return await search_haccp_products(keyword, page_no, num_of_rows)


@app.get("/api/search/imported", tags=["검색"], summary="제품명으로 수입식품 검색")
async def search_imported(keyword: str, page_no: int = 1, num_of_rows: int = 10):
    """공공데이터포털 수입식품 한글표시사항을 조회합니다. 수입 제품의 원재료명(IRDNT_NM)을 포함합니다."""
    return await search_imported_products(keyword, page_no, num_of_rows)


# 건강기능식품(C003)에서 못 찾은 제품의 fallback — 일반 가공식품 품목제조보고에서 원재료 조회
@app.get("/api/search/general", tags=["검색"], summary="제품명으로 일반 가공식품(건강보조식품) 검색")
async def search_general(keyword: str, start_idx: int = 1, end_idx: int = 10):
    """식품안전나라 C002(품목제조보고) 서비스를 프록시 호출합니다. C003과 동일하게 1시간 캐싱됩니다."""
    return await search_products(keyword, start_idx, end_idx, service_id=GENERAL_SERVICE_ID)


@app.get("/api/product-image", tags=["검색"], summary="네이버쇼핑에서 제품 이미지 조회")
async def product_image(query: str):
    """C003 등 이미지 소스가 없는 제품을 네이버쇼핑 검색으로 보강합니다.
    실패해도 500을 내지 않고 항상 200 + {"image_url": null}로 응답합니다."""
    return await search_product_image(query)


@app.get("/api/detail", tags=["검색"], summary="신고번호로 제품 상세 조회")
async def get_product_detail(report_no: str):
    """현재 프론트엔드는 검색 결과를 재사용해 호출하지 않지만, 준비는 되어 있습니다."""
    url = f"{BASE_URL}/{API_KEY}/{SERVICE_ID}/json/1/1/PRDLST_REPORT_NO={report_no}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="식품안전나라 API 호출 실패")

    result = parse_service_result(response.json())
    rows = result.get("row", [])

    return rows[0] if rows else None


# 성분 분류 사전 전체를 한 번에 내려줌 — 프론트엔드가 앱 시작 시 한 번만 받아서 캐싱해 사용
@app.get("/api/ingredients/categories", tags=["성분"], summary="성분 분류 사전 전체 조회")
async def get_ingredient_categories():
    """{ 성분명: 'functional' | 'additive' } 형태의 dict를 반환합니다."""
    return get_all_categories()


# 성분 간 상호작용 사전 전체 — 프론트엔드가 앱 시작 시 한 번 받아서, 제품별 매칭은 로컬에서 수행
@app.get("/api/interactions", tags=["성분"], summary="성분 간 상호작용 사전 전체 조회")
async def get_interactions():
    """함께 섭취 시 도움(synergy)/주의(caution)가 알려진 성분 조합 목록입니다. 의료 상담을 대체하지 않는 참고용 정보입니다."""
    return get_all_interactions()


class IngredientReport(BaseModel):
    name: str
    suggested_category: str
    reason: str | None = None


# 오분류 신고 접수 (자동 반영은 안 하고, DB에 쌓아뒀다가 나중에 검토해서 반영)
@app.post("/api/ingredients/report", tags=["성분"], summary="성분 오분류 신고 접수")
async def report_ingredient(report: IngredientReport):
    """자동으로 반영되지 않고, 검토용으로 DB에 적재만 됩니다."""
    add_report(report.name, report.suggested_category, report.reason)
    return {"status": "received"}


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SettingsRequest(BaseModel):
    health_mode: str | None = None
    allergies: list[str] | None = None


@app.post("/api/auth/signup", tags=["인증"], summary="회원가입")
async def signup(body: SignupRequest):
    """이메일이 이미 존재하면 400을 반환합니다. 성공 시 로그인에 쓸 JWT 토큰을 발급합니다."""
    try:
        user_id = create_user(body.email, body.password)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"token": create_token(user_id)}


@app.post("/api/auth/login", tags=["인증"], summary="로그인")
async def login(body: LoginRequest):
    """이메일/비밀번호가 일치하면 JWT 토큰을 발급합니다 (30일 만료)."""
    try:
        user_id = verify_login(body.email, body.password)
    except AuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return {"token": create_token(user_id)}


@app.get("/api/auth/me", tags=["인증"], summary="내 정보 조회")
async def get_me(user_id: int = Depends(get_current_user_id)):
    """`Authorization: Bearer <토큰>` 헤더가 필요합니다."""
    return get_user_info(user_id)


@app.put("/api/auth/settings", tags=["인증"], summary="개인화 모드 · 알레르기 변경")
async def update_settings(body: SettingsRequest, user_id: int = Depends(get_current_user_id)):
    """health_mode('none'|'pregnant'|'elderly'), allergies(알레르기 라벨 목록) 중 보낸 필드만 갱신합니다."""
    try:
        if body.health_mode is not None:
            set_health_mode(user_id, body.health_mode)
        if body.allergies is not None:
            set_allergies(user_id, body.allergies)
    except AuthError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "updated"}


# 특정 모드(임산부/노인 등)의 주의 성분 사전 — 로그인 여부와 무관하게 조회 가능한 공개 데이터
@app.get("/api/mode-warnings", tags=["개인화"], summary="모드별 주의 성분 사전 조회")
async def mode_warnings(mode: str):
    """{ 성분명: 주의 사유 } 형태의 dict를 반환합니다. 의료 상담을 대체하지 않는 참고용 정보입니다."""
    return get_mode_warnings(mode)


@app.get("/api/sync-status", tags=["동기화"], summary="백그라운드 동기화 실행 기록 조회")
async def sync_status():
    """인기 검색어를 1시간마다 미리 캐싱하는 백그라운드 작업의 최근 실행 기록입니다."""
    return get_sync_history()
