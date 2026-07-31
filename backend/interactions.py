import json

from db import get_connection

# 성분 간 상호작용 사전 — 1차 버전(근거가 잘 알려진 조합만), 의료 상담을 대체하지 않음
# type: "synergy"(함께 먹으면 도움) | "caution"(흡수 경쟁 등으로 시간차 섭취 권장)
# keywords: 원재료명에 이 키워드가 포함되면 해당 성분으로 간주 (예: "산화아연" → 아연)
# 추후 항목을 늘릴 때도 출처를 같이 남길 것
INTERACTIONS = [
    {
        "type": "synergy",
        "a_name": "철분",
        "a_keywords": ["철분", "제일철", "제이철", "헴철", "구연산철", "젖산철"],
        "b_name": "비타민C",
        "b_keywords": ["비타민C", "아스코르브산", "아스코르빈산"],
        "description": "비타민C는 식물성(비헴) 철분의 흡수를 도와줘요. 철분제와 함께 섭취하면 흡수율을 높일 수 있어요.",
        "source": "미국 국립보건원 보충제사무국(NIH ODS)",
    },
    {
        "type": "synergy",
        "a_name": "칼슘",
        "a_keywords": ["칼슘"],
        "b_name": "비타민D",
        "b_keywords": ["비타민D", "콜레칼시페롤", "에르고칼시페롤"],
        "description": "비타민D는 칼슘이 몸에 흡수되고 이용되는 데 필요해요. 식약처도 이 기능성을 공식 인정하고 있어요.",
        "source": "식품의약품안전처, 미국 국립보건원(NIH ODS)",
    },
    {
        "type": "synergy",
        "a_name": "유산균(프로바이오틱스)",
        "a_keywords": ["유산균", "프로바이오틱스", "락토바실러스", "비피도박테리움", "락토코쿠스"],
        "b_name": "프리바이오틱스",
        "b_keywords": ["프락토올리고당", "갈락토올리고당", "이눌린", "치커리", "프리바이오틱스"],
        "description": "프리바이오틱스(올리고당·이눌린 등)는 유산균의 먹이가 되어 장 속에서 유산균이 자라는 것을 도와요.",
        "source": "국제 프로바이오틱스·프리바이오틱스 과학협회(ISAPP)",
    },
    {
        "type": "synergy",
        "a_name": "커큐민(강황)",
        "a_keywords": ["커큐민", "강황", "울금"],
        "b_name": "피페린(후추)",
        "b_keywords": ["피페린", "후추", "바이오페린"],
        "description": "후추의 피페린은 흡수가 잘 안 되는 커큐민의 생체이용률(몸에 흡수되는 비율)을 크게 높인다는 연구가 있어요.",
        "source": "Planta Medica 학술지 (1998, Shoba 외)",
    },
    {
        "type": "caution",
        "a_name": "철분",
        "a_keywords": ["철분", "제일철", "제이철", "헴철", "구연산철", "젖산철"],
        "b_name": "칼슘",
        "b_keywords": ["칼슘"],
        "description": "칼슘은 철분의 흡수를 방해할 수 있어요. 두 성분을 모두 챙긴다면 시간 간격을 두고 섭취하는 것이 권장돼요.",
        "source": "미국 국립보건원 보충제사무국(NIH ODS)",
    },
    {
        "type": "caution",
        "a_name": "아연",
        "a_keywords": ["아연"],
        "b_name": "구리",
        "b_keywords": ["구리", "황산동"],
        "description": "고용량 아연을 오래 섭취하면 구리 흡수를 방해할 수 있어요. 두 성분이 함께 든 제품은 보통 이 점을 고려해 배합돼 있어요.",
        "source": "미국 국립보건원 보충제사무국(NIH ODS)",
    },
    {
        "type": "caution",
        "a_name": "철분",
        "a_keywords": ["철분", "제일철", "제이철", "헴철", "구연산철", "젖산철"],
        "b_name": "아연",
        "b_keywords": ["아연"],
        "description": "고용량 철분을 빈속에 섭취하면 아연 흡수를 방해할 수 있다는 보고가 있어요. 식사와 함께 섭취하면 영향이 줄어들어요.",
        "source": "미국 국립보건원 보충제사무국(NIH ODS)",
    },
    {
        "type": "caution",
        "a_name": "녹차추출물(카테킨)",
        "a_keywords": ["녹차", "카테킨"],
        "b_name": "철분",
        "b_keywords": ["철분", "제일철", "제이철", "헴철", "구연산철", "젖산철"],
        "description": "녹차의 카테킨·탄닌 성분은 식물성 철분의 흡수를 저해할 수 있어요. 철분제와는 시간 간격을 두는 것이 좋아요.",
        "source": "국제 연구 다수",
    },
]


def init_interactions_db():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS interactions (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL,
                a_name TEXT NOT NULL,
                a_keywords TEXT NOT NULL,
                b_name TEXT NOT NULL,
                b_keywords TEXT NOT NULL,
                description TEXT NOT NULL,
                source TEXT NOT NULL
            )
            """
        )

        cur.execute("SELECT COUNT(*) FROM interactions")
        count = cur.fetchone()[0]
        if count == 0:
            rows = [
                (
                    item["type"],
                    item["a_name"],
                    json.dumps(item["a_keywords"], ensure_ascii=False),
                    item["b_name"],
                    json.dumps(item["b_keywords"], ensure_ascii=False),
                    item["description"],
                    item["source"],
                )
                for item in INTERACTIONS
            ]
            cur.executemany(
                """
                INSERT INTO interactions (type, a_name, a_keywords, b_name, b_keywords, description, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                rows,
            )


# 상호작용 사전 전체를 리스트로 반환 — 프론트엔드가 앱 시작 시 한 번 받아서 캐싱해 사용
def get_all_interactions() -> list:
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT type, a_name, a_keywords, b_name, b_keywords, description, source FROM interactions"
        )
        rows = cur.fetchall()

    return [
        {
            "type": row[0],
            "a_name": row[1],
            "a_keywords": json.loads(row[2]),
            "b_name": row[3],
            "b_keywords": json.loads(row[4]),
            "description": row[5],
            "source": row[6],
        }
        for row in rows
    ]
