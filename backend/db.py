import json
import os
import time
from contextlib import contextmanager

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
CACHE_TTL_SECONDS = 3600  # 캐시 유효 시간 1시간

# 아래 세 가지 한계값이 없으면 죽은 DB 연결 하나가 서버 전체를 멈춰버림.
# 실제로 2026-08-12에 Railway Postgres와의 연결이 half-open 상태로 남아
# 모든 API가 무응답이 된 적 있음 (동기 DB 호출이 async 이벤트 루프를 붙잡기 때문)
CONNECT_TIMEOUT_SECONDS = 10  # 연결 수립까지 기다릴 최대 시간
STATEMENT_TIMEOUT_MS = 15000  # 쿼리 하나가 붙잡을 수 있는 최대 시간


@contextmanager
def get_connection():
    conn = psycopg2.connect(
        DATABASE_URL,
        connect_timeout=CONNECT_TIMEOUT_SECONDS,
        # TCP keepalive — 상대가 조용히 사라진 연결(half-open)을 OS가 감지해 끊어줌.
        # 30초 무응답 시 확인 시작, 10초 간격으로 3번 실패하면 연결 종료
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=3,
        options=f"-c statement_timeout={STATEMENT_TIMEOUT_MS}",
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS search_cache (
                keyword TEXT NOT NULL,
                start_idx INTEGER NOT NULL,
                end_idx INTEGER NOT NULL,
                response_json TEXT NOT NULL,
                cached_at REAL NOT NULL,
                PRIMARY KEY (keyword, start_idx, end_idx)
            )
            """
        )


# 캐시에 저장된 검색 결과를 가져옴. 없거나 오래됐으면(TTL 초과) None 반환
def get_cached_search(keyword, start_idx, end_idx):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT response_json, cached_at FROM search_cache
            WHERE keyword = %s AND start_idx = %s AND end_idx = %s
            """,
            (keyword, start_idx, end_idx),
        )
        row = cur.fetchone()

    if row is None:
        return None

    response_json, cached_at = row
    if time.time() - cached_at > CACHE_TTL_SECONDS:
        return None

    return json.loads(response_json)


# 만료된(TTL 지난) 캐시 행을 실제로 삭제 — 이걸 안 하면 오래된 행이 계속 쌓여서
# cache.db 파일이 줄어들지 않고 계속 커지기만 함
def _delete_expired():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM search_cache WHERE cached_at < %s",
            (time.time() - CACHE_TTL_SECONDS,),
        )


# 검색 결과를 캐시에 저장 (같은 검색어로 다시 저장하면 덮어씀)
def set_cached_search(keyword, start_idx, end_idx, data):
    _delete_expired()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO search_cache (keyword, start_idx, end_idx, response_json, cached_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (keyword, start_idx, end_idx)
            DO UPDATE SET response_json = excluded.response_json, cached_at = excluded.cached_at
            """,
            (keyword, start_idx, end_idx, json.dumps(data), time.time()),
        )
