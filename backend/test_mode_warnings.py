def test_pregnant_mode_warnings_includes_known_items(client):
    res = client.get("/api/mode-warnings?mode=pregnant")
    assert res.status_code == 200
    assert "카페인" in res.json()


def test_unknown_mode_returns_empty_dict(client):
    res = client.get("/api/mode-warnings?mode=doesnotexist")
    assert res.status_code == 200
    assert res.json() == {}
