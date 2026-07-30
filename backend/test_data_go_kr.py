from unittest.mock import AsyncMock, patch

# HACCP는 성공 코드가 "00"이 아니라 "OK"로 옴 (실제 응답 그대로 재현)
FAKE_HACCP_BODY = {
    "header": {"resultCode": "OK", "resultMessage": "success"},
    "body": {
        "totalCount": 1,
        "items": [
            {
                "item": {
                    "prdlstNm": "테스트 비타민 젤리",
                    "rawmtrl": "비타민C, 펙틴",
                    "allergy": "대두",
                    "imgurl1": "http://example.com/img.jpg",
                }
            }
        ],
    },
}

FAKE_IMPORTED_BODY = {
    "header": {"resultCode": "00", "resultMsg": "NORMAL SERVICE."},
    "body": {
        "totalCount": 1,
        "items": [
            {
                "item": {
                    "PRDUCT_KOREAN_NM": "수입 비타민B12",
                    "IRDNT_NM": "시아노코발라민",
                    "MNF_NTNCD_NM": "중국",
                }
            }
        ],
    },
}

FAKE_KEY_ERROR_BODY = {
    "header": {"resultCode": "30", "resultMsg": "SERVICE_KEY_IS_NOT_REGISTERED_ERROR"},
}


class FakeResponse:
    def __init__(self, body):
        self.status_code = 200
        self._body = body

    def json(self):
        return self._body


def test_haccp_search_flattens_items(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_HACCP_BODY))):
        res = client.get("/api/search/haccp?keyword=비타민")
        assert res.status_code == 200
        # [{"item": {...}}] 한 겹이 벗겨져서 내려와야 함
        product = res.json()["products"][0]
        assert product["rawmtrl"] == "비타민C, 펙틴"
        assert product["imgurl1"].endswith("img.jpg")


def test_imported_search_success(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_IMPORTED_BODY))):
        res = client.get("/api/search/imported?keyword=비타민")
        assert res.status_code == 200
        assert res.json()["products"][0]["IRDNT_NM"] == "시아노코발라민"


# 인증키 오류(resultCode != "00")는 502로 변환되고 캐싱되지 않아야 함
def test_key_error_is_not_cached(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_KEY_ERROR_BODY))) as mock_get:
        res1 = client.get("/api/search/haccp?keyword=키오류")
        assert res1.status_code == 502

        res2 = client.get("/api/search/haccp?keyword=키오류")
        assert res2.status_code == 502
        assert mock_get.call_count == 2
