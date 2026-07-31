from unittest.mock import AsyncMock, patch

import httpx

FAKE_SHOP_BODY = {
    "items": [
        {"title": "테스트 비타민 젤리", "image": "https://shopping-phinf.pstatic.net/img.jpg"}
    ]
}

FAKE_EMPTY_BODY = {"items": []}


class FakeResponse:
    def __init__(self, body, status_code=200):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


def test_product_image_success(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_SHOP_BODY))):
        res = client.get("/api/product-image?query=테스트 비타민 젤리")
        assert res.status_code == 200
        assert res.json()["image_url"].endswith("img.jpg")


def test_product_image_empty_items(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse(FAKE_EMPTY_BODY))):
        res = client.get("/api/product-image?query=존재하지않는제품")
        assert res.status_code == 200
        assert res.json()["image_url"] is None


def test_product_image_non_200_degrades_gracefully(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=FakeResponse({}, status_code=401))):
        res = client.get("/api/product-image?query=비타민")
        assert res.status_code == 200
        assert res.json()["image_url"] is None


def test_product_image_timeout_degrades_gracefully(client):
    with patch("httpx.AsyncClient.get", new=AsyncMock(side_effect=httpx.TimeoutException("timeout"))):
        res = client.get("/api/product-image?query=비타민")
        assert res.status_code == 200
        assert res.json()["image_url"] is None
