import os

# main.py가 import 시점에 API_KEY/AUTH_SECRET_KEY를 바로 읽으므로, 실제 .env보다 먼저
# 테스트용 값을 넣어둠 (외부 API 키가 없어도 테스트가 돌아가야 함)
os.environ.setdefault("FOOD_SAFETY_API_KEY", "test-key")
os.environ.setdefault("DATA_GO_KR_API_KEY", "test-key")
os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-key-for-tests-only-32bytes-min")
os.environ.setdefault("NAVER_CLIENT_ID", "test-naver-client-id")
os.environ.setdefault("NAVER_CLIENT_SECRET", "test-naver-client-secret")

import db

# db.DATABASE_URL을 innerbeauty_test DB 접속 문자열로 교체 — main import(= 테이블 생성)보다
# 반드시 먼저 실행돼야 함
db.DATABASE_URL = os.environ["TEST_DATABASE_URL"]

import pytest
from fastapi.testclient import TestClient

from main import app

# 사용자가 직접 만들어내는(=테스트마다 리셋해야 하는) 테이블만 초기화
# ingredients/mode_warnings는 앱 시작 시 한 번 시드되는 참고 데이터라 그대로 둠
MUTABLE_TABLES = ["search_cache", "ingredient_reports", "users", "user_settings", "sync_log"]


@pytest.fixture(autouse=True)
def clean_db():
    with db.get_connection() as conn:
        cur = conn.cursor()
        # DELETE 대신 TRUNCATE ... RESTART IDENTITY: user_settings가 users.id를 참조하므로
        # CASCADE로 함께 비우고, SERIAL 시퀀스도 1로 되돌려 테스트마다 user_id가 안정적이게 함
        cur.execute(f"TRUNCATE TABLE {', '.join(MUTABLE_TABLES)} RESTART IDENTITY CASCADE")
    yield


@pytest.fixture
def client():
    return TestClient(app)
