import time
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from db import get_connection
from search_service import search_products

# 자주 검색될 만한 키워드를 미리 캐싱해두는 대상 목록 — 1차 버전
POPULAR_KEYWORDS = ["비타민C", "오메가3", "유산균", "홍삼", "루테인"]

scheduler = AsyncIOScheduler()


def init_sync_log_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ran_at REAL NOT NULL,
                success_count INTEGER NOT NULL,
                fail_count INTEGER NOT NULL
            )
            """
        )


# 인기 키워드를 순서대로 검색해서 캐시를 미리 채워둠 (사용자가 검색하기 전에 준비)
# 키워드 하나가 실패해도 나머지는 계속 진행하고, 마지막에 결과를 sync_log에 남김
async def sync_popular_keywords():
    success_count = 0
    fail_count = 0

    for keyword in POPULAR_KEYWORDS:
        try:
            await search_products(keyword)
            success_count += 1
        except Exception:
            fail_count += 1

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sync_log (ran_at, success_count, fail_count) VALUES (?, ?, ?)",
            (time.time(), success_count, fail_count),
        )


# 최근 동기화 실행 기록 조회 (최신순)
def get_sync_history(limit: int = 10) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT ran_at, success_count, fail_count FROM sync_log ORDER BY ran_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [{"ran_at": ran_at, "success_count": s, "fail_count": f} for ran_at, s, f in rows]


def start_scheduler():
    scheduler.add_job(sync_popular_keywords, "interval", hours=1, next_run_time=datetime.now())
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown(wait=False)
