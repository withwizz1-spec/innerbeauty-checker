from db import get_connection

# 개인 맞춤 모드별 주의 성분 사전 — 1차 버전(잘 알려진 소수 항목만), 의료 상담을 대체하지 않음
# 출처가 명확한 항목 위주로 구성. 추후 항목을 늘릴 때도 출처를 같이 남길 것
MODE_WARNINGS = {
    "pregnant": [
        ("카페인", "세계보건기구(WHO)는 임신 중 카페인 섭취를 하루 200mg 이하로 권고하고 있어요"),
        ("알로에", "알로에 전잎 추출물은 자궁 수축 우려로 임신 중 섭취 주의가 권고된 사례가 있어요"),
        ("비타민A", "고함량 비타민A(레티놀)의 과잉 섭취는 임신 중 태아에 영향을 줄 수 있다는 보고가 있어요"),
    ],
    "elderly": [
        ("카페인", "나이가 들면 카페인 대사가 느려져 적은 양에도 민감하게 반응할 수 있어요"),
        ("글루코사민", "항응고제(혈액을 묽게 하는 약)를 복용 중이라면 상호작용 가능성이 있어 주의가 필요해요"),
    ],
}


def init_mode_warnings_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mode_warnings (
                mode TEXT NOT NULL,
                ingredient_name TEXT NOT NULL,
                reason TEXT NOT NULL,
                PRIMARY KEY (mode, ingredient_name)
            )
            """
        )

        count = conn.execute("SELECT COUNT(*) FROM mode_warnings").fetchone()[0]
        if count == 0:
            rows = [
                (mode, name, reason)
                for mode, entries in MODE_WARNINGS.items()
                for name, reason in entries
            ]
            conn.executemany(
                "INSERT INTO mode_warnings (mode, ingredient_name, reason) VALUES (?, ?, ?)", rows
            )


# 특정 모드의 주의 성분 사전을 { 성분명: 이유 } dict로 반환
def get_mode_warnings(mode: str) -> dict:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT ingredient_name, reason FROM mode_warnings WHERE mode = ?", (mode,)
        ).fetchall()
    return dict(rows)
