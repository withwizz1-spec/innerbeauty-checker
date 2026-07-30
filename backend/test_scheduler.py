import asyncio
from unittest.mock import AsyncMock, patch

from scheduler import POPULAR_KEYWORDS, get_sync_history, sync_popular_keywords

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


class FakeResponse:
    def __init__(self, body):
        self.status_code = 200
        self._body = body

    def json(self):
        return self._body


def test_sync_all_success_logs_correct_counts(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_SUCCESS_BODY))):
        asyncio.run(sync_popular_keywords())

    history = get_sync_history()
    assert len(history) == 1
    assert history[0]["success_count"] == len(POPULAR_KEYWORDS)
    assert history[0]["fail_count"] == 0


def test_sync_all_failing_logs_fail_count(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_ERROR_BODY))):
        asyncio.run(sync_popular_keywords())

    history = get_sync_history()
    assert history[0]["success_count"] == 0
    assert history[0]["fail_count"] == len(POPULAR_KEYWORDS)


def test_sync_status_endpoint_returns_history(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_SUCCESS_BODY))):
        asyncio.run(sync_popular_keywords())

    res = client.get("/api/sync-status")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["success_count"] == len(POPULAR_KEYWORDS)
