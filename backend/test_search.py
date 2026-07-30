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


def test_search_external_error_is_not_cached(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_ERROR_BODY))) as mock_get:
        res1 = client.get("/api/search?keyword=장애테스트")
        assert res1.status_code == 502
        assert mock_get.call_count == 1

        # 에러 응답은 캐싱되지 않으므로, 같은 검색어라도 다시 외부 API를 호출해야 함
        res2 = client.get("/api/search?keyword=장애테스트")
        assert res2.status_code == 502
        assert mock_get.call_count == 2
