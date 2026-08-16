import urllib.parse

# 찜한 시점의 제품 정보를 통째로 저장하므로, 원재료명까지 그대로 돌아와야 궁합 분석이 가능함
PRODUCT = {
    "PRDLST_NM": "비타민C 1000 이지츄어블정",
    "BSSH_NM": "안국건강",
    "PRDLST_REPORT_NO": "200400150832410",
    "RAWMTRL_NM": "비타민C, 대두레시틴, 아스파탐",
    "PRIMARY_FNCLTY": "항산화에 도움을 줄 수 있음",
}

# 신고번호가 없는 소스(수입식품 등) — 제품명|업소명으로 키가 만들어져야 함
PRODUCT_NO_REPORT_NO = {
    "PRDLST_NM": "이너랑 저분자 콜라겐 스틱",
    "BSSH_NM": "코스맥스바이오",
    "RAWMTRL_NM": "콜라겐펩타이드, 정제수",
}


def auth_header(client, email="fav@example.com"):
    res = client.post("/api/auth/signup", json={"email": email, "password": "password123"})
    return {"Authorization": f"Bearer {res.json()['token']}"}


def test_favorites_require_auth(client):
    assert client.get("/api/favorites").status_code == 401
    assert client.post("/api/favorites", json={"product": PRODUCT}).status_code == 401
    assert client.delete("/api/favorites/anything").status_code == 401


def test_add_and_list_favorite(client):
    headers = auth_header(client)

    res = client.post("/api/favorites", json={"product": PRODUCT}, headers=headers)
    assert res.status_code == 200
    assert res.json()["product_key"] == PRODUCT["PRDLST_REPORT_NO"]

    listed = client.get("/api/favorites", headers=headers).json()
    assert len(listed) == 1
    # 원재료명이 그대로 보존돼야 함 (외부 API가 죽어도 궁합 분석이 되도록)
    assert listed[0]["product"]["RAWMTRL_NM"] == PRODUCT["RAWMTRL_NM"]
    assert listed[0]["product"]["PRDLST_NM"] == PRODUCT["PRDLST_NM"]


def test_favorite_key_falls_back_to_name_and_company(client):
    headers = auth_header(client)
    res = client.post("/api/favorites", json={"product": PRODUCT_NO_REPORT_NO}, headers=headers)
    assert res.json()["product_key"] == "이너랑 저분자 콜라겐 스틱|코스맥스바이오"


# 같은 제품을 두 번 찜해도 목록에 하나만 남고, 제품 정보는 최신으로 갱신돼야 함
def test_duplicate_favorite_updates_instead_of_duplicating(client):
    headers = auth_header(client)
    client.post("/api/favorites", json={"product": PRODUCT}, headers=headers)

    updated = {**PRODUCT, "RAWMTRL_NM": "비타민C, 스테아린산마그네슘"}
    client.post("/api/favorites", json={"product": updated}, headers=headers)

    listed = client.get("/api/favorites", headers=headers).json()
    assert len(listed) == 1
    assert listed[0]["product"]["RAWMTRL_NM"] == "비타민C, 스테아린산마그네슘"


def test_remove_favorite(client):
    headers = auth_header(client)
    key = client.post("/api/favorites", json={"product": PRODUCT}, headers=headers).json()["product_key"]

    assert client.delete(f"/api/favorites/{key}", headers=headers).status_code == 200
    assert client.get("/api/favorites", headers=headers).json() == []


# 제품명|업소명 키에는 공백·한글·| 가 섞여 있어서 URL 인코딩된 경로로도 지워져야 함
def test_remove_favorite_with_composite_key(client):
    headers = auth_header(client)
    key = client.post(
        "/api/favorites", json={"product": PRODUCT_NO_REPORT_NO}, headers=headers
    ).json()["product_key"]

    res = client.delete(f"/api/favorites/{urllib.parse.quote(key)}", headers=headers)
    assert res.status_code == 200
    assert client.get("/api/favorites", headers=headers).json() == []


def test_remove_unknown_favorite_returns_404(client):
    headers = auth_header(client)
    assert client.delete("/api/favorites/없는키", headers=headers).status_code == 404


# 다른 사람이 찜한 제품은 보이지도, 지워지지도 않아야 함
def test_favorites_are_isolated_per_user(client):
    alice = auth_header(client, "alice@example.com")
    bob = auth_header(client, "bob@example.com")

    key = client.post("/api/favorites", json={"product": PRODUCT}, headers=alice).json()["product_key"]

    assert client.get("/api/favorites", headers=bob).json() == []
    assert client.delete(f"/api/favorites/{key}", headers=bob).status_code == 404
    assert len(client.get("/api/favorites", headers=alice).json()) == 1


def test_product_without_name_rejected(client):
    headers = auth_header(client)
    res = client.post("/api/favorites", json={"product": {"BSSH_NM": "업체만 있음"}}, headers=headers)
    assert res.status_code == 400
