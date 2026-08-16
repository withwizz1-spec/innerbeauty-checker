import urllib.parse
from unittest.mock import AsyncMock, patch

import httpx

FAKE_SUCCESS_BODY = {
    "C003": {
        "total_count": "1",
        "RESULT": {"CODE": "INFO-000", "MSG": "정상"},
        "row": [{"PRDLST_NM": "테스트 상품"}],
    }
}

FAKE_ERROR_BODY = {
    "C003": {
        "total_count": "0",
        "RESULT": {"CODE": "ERROR-500", "MSG": "서버오류입니다."},
    }
}

FAKE_GENERAL_BODY = {
    "C002": {
        "total_count": "1",
        "RESULT": {"CODE": "INFO-000", "MSG": "정상"},
        "row": [{"PRDLST_NM": "테스트 젤리", "RAWMTRL_NM": "비타민C, 구연산"}],
    }
}


class FakeResponse:
    def __init__(self, body):
        self.status_code = 200
        self._body = body

    def json(self):
        return self._body


# 외부 API를 실제로 부르지 않고 mock으로 대체 — 식품안전나라 상태와 무관하게 항상 검증 가능
def test_search_success_and_cache_hit(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_SUCCESS_BODY))) as mock_get:
        res1 = client.get("/api/search?keyword=테스트")
        assert res1.status_code == 200
        assert res1.json()["totalCount"] == 1
        assert mock_get.call_count == 1

        # 같은 검색어로 재요청 → 캐시에서 응답, 외부 API 호출 횟수 그대로
        res2 = client.get("/api/search?keyword=테스트")
        assert res2.status_code == 200
        assert mock_get.call_count == 1


def test_search_general_success(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_GENERAL_BODY))):
        res = client.get("/api/search/general?keyword=테스트")
        assert res.status_code == 200
        assert res.json()["products"][0]["RAWMTRL_NM"] == "비타민C, 구연산"


# 같은 검색어라도 C003 캐시가 C002 결과로 응답되면 안 됨 (캐시 키 분리 검증)
def test_search_caches_are_separated_by_service(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_SUCCESS_BODY))) as mock_get:
        client.get("/api/search?keyword=분리테스트")
        assert mock_get.call_count == 1

    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_GENERAL_BODY))) as mock_get:
        res = client.get("/api/search/general?keyword=분리테스트")
        # C003 캐시를 재사용하지 않고 C002를 새로 호출해야 함
        assert mock_get.call_count == 1
        assert res.json()["products"][0]["PRDLST_NM"] == "테스트 젤리"


class FakeInvalidJsonResponse:
    def __init__(self):
        self.status_code = 200

    def json(self):
        raise ValueError("Expecting value: line 1 column 1 (char 0)")


# 200 OK인데 본문이 JSON이 아닌 경우(빈 응답 등) — 실제로 겪은 케이스, 502로 처리돼야 함
def test_search_invalid_json_response_returns_502(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeInvalidJsonResponse())):
        res = client.get("/api/search?keyword=깨진응답")
        assert res.status_code == 502


# 식품안전나라 응답이 느려서(실측 14초+) 타임아웃되는 경우 — 504로 처리돼야 함
def test_search_timeout_returns_504(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.TimeoutException("timeout"))):
        res = client.get("/api/search?keyword=타임아웃테스트")
        assert res.status_code == 504


# --- 검색어 분해 재시도 ---
# 식약처는 제품명을 통째로 대조해서 "이너랩 홀드잇"처럼 브랜드+제품명을 붙여 넣으면 0건이 남.
# 0건일 때 단어별로 쪼개 다시 조회하는지 검증
def _body(total, rows):
    return {"C003": {"total_count": str(total), "RESULT": {"CODE": "INFO-000", "MSG": "정상"}, "row": rows}}


EMPTY_BODY = {"C003": {"total_count": "0", "RESULT": {"CODE": "INFO-000", "MSG": "정상"}}}


def test_search_falls_back_to_tokens_when_no_result(client):
    responses = {
        "이너랩 홀드잇": EMPTY_BODY,  # 전체 검색어로는 0건
        "이너랩": _body(1, [{"PRDLST_NM": "이너랩 신바이오틱스", "PRDLST_REPORT_NO": "A1"}]),
        "홀드잇": _body(1, [{"PRDLST_NM": "홀드잇 MAD 매드", "PRDLST_REPORT_NO": "B2"}]),
    }

    async def fake_get(self, url, *args, **kwargs):
        keyword = urllib.parse.unquote(url.split("PRDLST_NM=")[1])
        return FakeResponse(responses[keyword])

    with patch("httpx.AsyncClient.get", new=fake_get):
        res = client.get("/api/search?keyword=이너랩 홀드잇")
        assert res.status_code == 200
        names = [p["PRDLST_NM"] for p in res.json()["products"]]
        # 순서는 아래 정렬 테스트들이 따로 검증 — 여기선 두 토큰 결과가 모두 합쳐졌는지만 확인
        assert set(names) == {"이너랩 신바이오틱스", "홀드잇 MAD 매드"}
        assert res.json()["totalCount"] == 2


# 실제 데이터와 같은 상황: 흔한 브랜드명(이너랩 6건)과 희귀한 제품명(홀드잇 2건)이 섞였을 때
# 걸린 건수가 적은 쪽 = 그 검색을 특징짓는 단어이므로, 홀드잇 제품이 위로 와야 함
def test_search_ranks_rare_token_matches_first(client):
    responses = {
        "이너랩 홀드잇": EMPTY_BODY,
        "이너랩": _body(6, [
            {"PRDLST_NM": f"이너랩 제품{i}", "PRDLST_REPORT_NO": f"A{i}"} for i in range(1, 7)
        ]),
        "홀드잇": _body(2, [
            {"PRDLST_NM": "홀드잇 MAD 매드", "PRDLST_REPORT_NO": "B1"},
            {"PRDLST_NM": "홀드잇 JELLY 그린포켓젤리", "PRDLST_REPORT_NO": "B2"},
        ]),
    }

    async def fake_get(self, url, *args, **kwargs):
        keyword = urllib.parse.unquote(url.split("PRDLST_NM=")[1])
        return FakeResponse(responses[keyword])

    with patch("httpx.AsyncClient.get", new=fake_get):
        res = client.get("/api/search?keyword=이너랩 홀드잇")
        names = [p["PRDLST_NM"] for p in res.json()["products"]]
        assert names[:2] == ["홀드잇 MAD 매드", "홀드잇 JELLY 그린포켓젤리"]
        assert len(names) == 8


# 희소성만 쓰면 뒤집히는 경우: 락토핏(57건)이 종근당건강(19건)보다 흔한 단어로 취급돼
# 정작 찾던 락토핏 제품이 뒤로 밀렸음. 제품명이 그 토큰으로 시작하면 가산점을 줘서 보정
def test_search_ranks_prefix_matches_first_even_when_token_is_common(client):
    responses = {
        "종근당건강 락토핏": EMPTY_BODY,
        "종근당건강": _body(19, [
            {"PRDLST_NM": f"종근당건강 기타제품{i}", "PRDLST_REPORT_NO": f"A{i}"} for i in range(1, 4)
        ]),
        "락토핏": _body(57, [
            {"PRDLST_NM": "락토핏 솔루션 스킨", "PRDLST_REPORT_NO": "B1"},
            {"PRDLST_NM": "락토핏 생유산균 코어", "PRDLST_REPORT_NO": "B2"},
        ]),
    }

    async def fake_get(self, url, *args, **kwargs):
        keyword = urllib.parse.unquote(url.split("PRDLST_NM=")[1])
        return FakeResponse(responses[keyword])

    with patch("httpx.AsyncClient.get", new=fake_get):
        res = client.get("/api/search?keyword=종근당건강 락토핏")
        names = [p["PRDLST_NM"] for p in res.json()["products"]]
        assert names[:2] == ["락토핏 솔루션 스킨", "락토핏 생유산균 코어"]


# 두 토큰에 모두 걸린 제품은 점수가 합산되어 가장 위로 와야 함
def test_search_ranks_product_matching_both_tokens_first(client):
    both = {"PRDLST_NM": "이너랩 홀드잇 콤보", "PRDLST_REPORT_NO": "C1"}
    responses = {
        "이너랩 홀드잇": EMPTY_BODY,
        "이너랩": _body(2, [both, {"PRDLST_NM": "이너랩 신바이오틱스", "PRDLST_REPORT_NO": "A1"}]),
        "홀드잇": _body(2, [both, {"PRDLST_NM": "홀드잇 MAD 매드", "PRDLST_REPORT_NO": "B1"}]),
    }

    async def fake_get(self, url, *args, **kwargs):
        keyword = urllib.parse.unquote(url.split("PRDLST_NM=")[1])
        return FakeResponse(responses[keyword])

    with patch("httpx.AsyncClient.get", new=fake_get):
        res = client.get("/api/search?keyword=이너랩 홀드잇")
        names = [p["PRDLST_NM"] for p in res.json()["products"]]
        assert names[0] == "이너랩 홀드잇 콤보"
        assert len(names) == 3  # 중복 제거됨


# 단어가 하나뿐이면 쪼갤 게 없으므로 추가 호출 없이 0건 그대로 반환해야 함
def test_search_single_token_does_not_retry(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(EMPTY_BODY))) as mock_get:
        res = client.get("/api/search?keyword=없는제품")
        assert res.status_code == 200
        assert res.json()["products"] == []
        assert mock_get.call_count == 1


def test_search_external_error_is_not_cached(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_ERROR_BODY))) as mock_get:
        res1 = client.get("/api/search?keyword=장애테스트")
        assert res1.status_code == 502
        assert mock_get.call_count == 1

        # 에러 응답은 캐싱되지 않으므로, 같은 검색어라도 다시 외부 API를 호출해야 함
        res2 = client.get("/api/search?keyword=장애테스트")
        assert res2.status_code == 502
        assert mock_get.call_count == 2
