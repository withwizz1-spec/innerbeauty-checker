import json
import time

from db import get_connection


class FavoriteError(Exception):
    pass


def init_favorites_db():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                product_key TEXT NOT NULL,
                product JSONB NOT NULL,
                created_at REAL NOT NULL,
                UNIQUE (user_id, product_key)
            )
            """
        )


# 제품을 식별하는 키 — 검색 결과 병합·리스트 key와 같은 규칙을 씀.
# 수입식품처럼 신고번호가 없는 소스도 있어서 제품명+업소명으로 보강
def build_product_key(product: dict) -> str:
    report_no = (product.get("PRDLST_REPORT_NO") or "").strip()
    if report_no:
        return report_no

    name = (product.get("PRDLST_NM") or "").strip()
    bssh = (product.get("BSSH_NM") or "").strip()
    if not name:
        raise FavoriteError("제품 정보가 올바르지 않아요")
    return f"{name}|{bssh}"


# 찜한 시점의 제품 정보를 통째로 저장한다.
# 식약처 API는 신고번호로 다시 조회할 수단이 없고 09~19시엔 아예 막히기 때문에,
# 키만 저장하면 찜 목록조차 못 여는 상황이 생김. 원재료명은 궁합 분석에도 필요함
def add_favorite(user_id: int, product: dict) -> str:
    key = build_product_key(product)

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO favorites (user_id, product_key, product, created_at)
            VALUES (%s, %s, %s::jsonb, %s)
            ON CONFLICT (user_id, product_key)
            DO UPDATE SET product = EXCLUDED.product
            """,
            (user_id, key, json.dumps(product, ensure_ascii=False), time.time()),
        )
    return key


def list_favorites(user_id: int) -> list[dict]:
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT product_key, product, created_at
            FROM favorites
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()

    return [{"product_key": r[0], "product": r[1], "created_at": r[2]} for r in rows]


def remove_favorite(user_id: int, product_key: str) -> bool:
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM favorites WHERE user_id = %s AND product_key = %s",
            (user_id, product_key),
        )
        return cur.rowcount > 0
