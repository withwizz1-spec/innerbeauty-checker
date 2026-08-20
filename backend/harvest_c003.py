"""C003(건강기능식품 품목제조신고) 전체 원재료명 수집 스크립트.

사전 보강을 위해 "지금 실제로 유통되는 제품에 어떤 원료가 얼마나 자주 등장하는지"를
알아야 하는데, 그 근거가 될 원본 데이터를 통째로 받아 파일로 남긴다.

이 스크립트를 따로 둔 이유 — 식품안전나라 OPEN-API는 매일 09~19시에 막히기 때문에,
"수집"(시간 제약 있음)과 "분류 판단"(아무 때나 가능)을 분리해야 한다.
한 번 받아두면 사전 큐레이션은 API 시간대와 무관하게 진행할 수 있다.

검색어 없이 조회하면 전체가 나온다(2026-08-20 기준 45,691건). 한 번에 최대 1,000건.

사용법:
    python harvest_c003.py            # 전체 수집 → data/c003_raw.json
    python harvest_c003.py --limit 3  # 페이지 3개만 (동작 확인용)
"""

import argparse
import json
import os
import pathlib
import sys
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("FOOD_SAFETY_API_KEY") or os.getenv("API_KEY")
BASE_URL = "http://openapi.foodsafetykorea.go.kr/api"
SERVICE_ID = "C003"
PAGE_SIZE = 1000  # API 상한. 1,001건도 통과하지만 문서상 한도인 1,000으로 맞춤
REQUEST_TIMEOUT = 60
POLITE_DELAY = 0.3  # 연속 호출 사이 간격 — 공공 API에 부담 주지 않기 위함

OUT_PATH = pathlib.Path(__file__).parent / "data" / "c003_raw.json"

# 사전 보강에 필요한 필드만 남김 (17개 필드 전부 저장하면 파일이 불필요하게 커짐)
KEEP_FIELDS = ["PRDLST_REPORT_NO", "PRDLST_NM", "BSSH_NM", "RAWMTRL_NM", "PRIMARY_FNCLTY"]


def fetch_page(client: httpx.Client, start: int, end: int) -> tuple[list[dict], int]:
    url = f"{BASE_URL}/{API_KEY}/{SERVICE_ID}/json/{start}/{end}"
    response = client.get(url)
    response.raise_for_status()
    result = response.json().get(SERVICE_ID, {})

    code = result.get("RESULT", {}).get("CODE", "")
    if code.startswith("ERROR"):
        msg = result.get("RESULT", {}).get("MSG", "")
        raise RuntimeError(f"{code}: {msg}")

    total = int(result.get("total_count") or 0)
    rows = [{k: row.get(k) for k in KEEP_FIELDS} for row in result.get("row", [])]
    return rows, total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="받을 페이지 수 (기본: 전체)")
    args = parser.parse_args()

    if not API_KEY:
        print("FOOD_SAFETY_API_KEY가 .env에 없습니다.", file=sys.stderr)
        return 1

    products: list[dict] = []
    started = time.time()

    with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
        rows, total = fetch_page(client, 1, PAGE_SIZE)
        products.extend(rows)
        page_count = (total + PAGE_SIZE - 1) // PAGE_SIZE
        if args.limit:
            page_count = min(page_count, args.limit)
        print(f"전체 {total:,}건 / {page_count}페이지")

        for page in range(1, page_count):
            start = page * PAGE_SIZE + 1
            end = start + PAGE_SIZE - 1
            time.sleep(POLITE_DELAY)
            try:
                rows, _ = fetch_page(client, start, end)
            except Exception as exc:
                # 한 페이지가 실패해도 지금까지 받은 건 살림 — 재수집은 API 시간대를 다시 기다려야 하므로
                print(f"  ! {start}~{end} 실패({exc}) — 건너뜀", file=sys.stderr)
                continue
            products.extend(rows)
            print(f"  {start:>6,}~{end:>6,}  누적 {len(products):,}건", flush=True)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(products, ensure_ascii=False), encoding="utf-8")

    with_raw = sum(1 for p in products if p.get("RAWMTRL_NM"))
    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(
        f"\n완료: {len(products):,}건 저장 ({size_mb:.1f}MB, {time.time() - started:.0f}초)\n"
        f"원재료명 있는 제품: {with_raw:,}건 ({with_raw / max(len(products), 1) * 100:.1f}%)\n"
        f"→ {OUT_PATH}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
