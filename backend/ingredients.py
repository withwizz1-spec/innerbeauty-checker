import time

from db import get_connection

# 기존 프론트엔드(src/data/ingredientCategory.js)에 하드코딩돼있던 사전을 그대로 이전
# 1차 버전 — 자주 등장하는 성분 위주. 자체 큐레이션(공식 원료 DB 대조 아직 안 함)
FUNCTIONAL_INGREDIENTS = [
    "비타민C", "비타민A", "비타민D", "비타민E", "비타민K",
    "비타민B1", "비타민B2", "비타민B6", "비타민B12",
    "엽산", "나이아신", "판토텐산", "비오틴",
    "아연", "철", "칼슘", "마그네슘", "셀레늄", "구리", "망간", "크롬", "몰리브덴", "요오드",
    "오메가3", "EPA", "DHA", "감마리놀렌산",
    "유산균", "프로바이오틱스", "락토바실러스", "비피더스",
    "홍삼", "인삼", "프락토올리고당", "식이섬유", "차전자피",
    "루테인", "지아잔틴", "밀크씨슬", "실리마린",
    "코엔자임큐텐", "글루코사민", "콜라겐", "MSM",
    "가르시니아", "녹차추출물", "카테킨", "프로폴리스",
    "쏘팔메토", "보스웰리아", "아르기닌", "테아닌",
]

ADDITIVE_INGREDIENTS = [
    "스테아린산마그네슘", "이산화규소", "결정셀룰로오스", "히드록시프로필메틸셀룰로오스",
    "이소말트", "에리스리톨", "자일리톨", "말토덱스트린", "덱스트린", "아라비아검",
    "수크랄로스", "아스파탐", "아세설팜칼륨", "스테비올배당체", "효소처리스테비아",
    "구연산", "사과산", "젖산", "이산화티타늄",
    "카라기난", "젤라틴", "글리세린", "카나우바왁스", "탈크",
]


def init_ingredients_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingredients (
                name TEXT PRIMARY KEY,
                category TEXT NOT NULL CHECK (category IN ('functional', 'additive'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ingredient_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                suggested_category TEXT NOT NULL,
                reason TEXT,
                reported_at REAL NOT NULL
            )
            """
        )

        # 테이블이 비어있을 때만 초기 사전 데이터로 시드
        count = conn.execute("SELECT COUNT(*) FROM ingredients").fetchone()[0]
        if count == 0:
            rows = [(name, "functional") for name in FUNCTIONAL_INGREDIENTS]
            rows += [(name, "additive") for name in ADDITIVE_INGREDIENTS]
            conn.executemany("INSERT INTO ingredients (name, category) VALUES (?, ?)", rows)


# 성분명 → 분류 전체 사전을 dict로 반환 (프론트엔드가 한 번에 받아서 캐싱해서 씀)
def get_all_categories() -> dict:
    with get_connection() as conn:
        rows = conn.execute("SELECT name, category FROM ingredients").fetchall()
    return dict(rows)


# 오분류 신고 저장 (자동 반영은 안 하고, 나중에 검토용으로 쌓아둠)
def add_report(name: str, suggested_category: str, reason: str | None):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO ingredient_reports (name, suggested_category, reason, reported_at) VALUES (?, ?, ?, ?)",
            (name, suggested_category, reason, time.time()),
        )
