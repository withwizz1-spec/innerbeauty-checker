def test_get_categories_includes_seed_data(client):
    res = client.get("/api/ingredients/categories")
    assert res.status_code == 200
    data = res.json()
    assert data["비타민C"] == "functional"
    assert data["스테아린산마그네슘"] == "additive"


def test_report_misclassification(client):
    res = client.post(
        "/api/ingredients/report",
        json={"name": "테스트성분", "suggested_category": "additive", "reason": "테스트 사유"},
    )
    assert res.status_code == 200
    assert res.json() == {"status": "received"}
