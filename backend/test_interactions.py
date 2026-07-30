def test_interactions_returns_seeded_list(client):
    res = client.get("/api/interactions")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    # 대표 조합(철분+비타민C 시너지)이 포함되어 있는지
    assert any(i["a_name"] == "철분" and i["b_name"] == "비타민C" for i in items)


def test_interaction_item_has_required_fields(client):
    res = client.get("/api/interactions")
    item = res.json()[0]
    assert item["type"] in ("synergy", "caution")
    # keywords는 JSON 문자열이 아니라 리스트로 풀려서 와야 함 (프론트가 바로 순회)
    assert isinstance(item["a_keywords"], list)
    assert isinstance(item["b_keywords"], list)
    assert item["description"]
    assert item["source"]
