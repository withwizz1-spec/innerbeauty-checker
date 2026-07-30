def test_signup_returns_token(client):
    res = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "token" in res.json()


def test_signup_duplicate_email_rejected(client):
    client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    res = client.post("/api/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    assert res.status_code == 400


def test_login_wrong_password_rejected(client):
    client.post("/api/auth/signup", json={"email": "b@example.com", "password": "correctpw123"})
    res = client.post("/api/auth/login", json={"email": "b@example.com", "password": "wrongpw"})
    assert res.status_code == 401


def test_login_success(client):
    client.post("/api/auth/signup", json={"email": "c@example.com", "password": "password123"})
    res = client.post("/api/auth/login", json={"email": "c@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "token" in res.json()


def test_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_me_with_valid_token(client):
    signup = client.post("/api/auth/signup", json={"email": "d@example.com", "password": "password123"})
    token = signup.json()["token"]

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json() == {"email": "d@example.com", "health_mode": "none", "allergies": []}


def test_update_settings_reflected_in_me(client):
    signup = client.post("/api/auth/signup", json={"email": "e@example.com", "password": "password123"})
    token = signup.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put("/api/auth/settings", json={"health_mode": "pregnant"}, headers=headers)
    assert res.status_code == 200

    me = client.get("/api/auth/me", headers=headers)
    assert me.json()["health_mode"] == "pregnant"


def test_update_allergies_reflected_in_me(client):
    signup = client.post("/api/auth/signup", json={"email": "e2@example.com", "password": "password123"})
    token = signup.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put("/api/auth/settings", json={"allergies": ["우유", "대두"]}, headers=headers)
    assert res.status_code == 200

    me = client.get("/api/auth/me", headers=headers)
    assert me.json()["allergies"] == ["우유", "대두"]
    assert me.json()["health_mode"] == "none"  # allergies만 보내면 health_mode는 그대로 유지


def test_update_settings_invalid_mode_rejected(client):
    signup = client.post("/api/auth/signup", json={"email": "f@example.com", "password": "password123"})
    token = signup.json()["token"]

    res = client.put(
        "/api/auth/settings",
        json={"health_mode": "not-a-real-mode"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
