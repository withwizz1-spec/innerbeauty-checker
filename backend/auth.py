import json
import os
import sqlite3
import time

import bcrypt
import jwt
from dotenv import load_dotenv

from db import get_connection

load_dotenv()

SECRET_KEY = os.environ["AUTH_SECRET_KEY"]
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30  # 로그인 유지 30일

VALID_HEALTH_MODES = ("none", "pregnant", "elderly") # 임산부/노인 모드 값 화이트리스트


def init_auth_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id),
                health_mode TEXT NOT NULL DEFAULT 'none',
                allergies TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        try:
            # 기존에 만들어진 DB 파일에는 위 CREATE TABLE이 적용 안 되므로 컬럼을 직접 추가
            conn.execute("ALTER TABLE user_settings ADD COLUMN allergies TEXT NOT NULL DEFAULT '[]'")
        except sqlite3.OperationalError:
            pass  # 이미 컬럼이 있는 경우(새로 만든 DB)


class AuthError(Exception):
    pass


def create_user(email: str, password: str) -> int:
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise AuthError("이미 가입된 이메일이에요")

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (email, password_hash, time.time()),
        )
        user_id = cursor.lastrowid
        conn.execute("INSERT INTO user_settings (user_id, health_mode) VALUES (?, 'none')", (user_id,))
        return user_id


def verify_login(email: str, password: str) -> int:
    with get_connection() as conn:
        row = conn.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,)).fetchone()

    if row is None:
        raise AuthError("이메일 또는 비밀번호가 올바르지 않아요")

    user_id, password_hash = row
    if not bcrypt.checkpw(password.encode(), password_hash.encode()):
        raise AuthError("이메일 또는 비밀번호가 올바르지 않아요")

    return user_id


def create_token(user_id: int) -> str:
    payload = {"user_id": user_id, "exp": time.time() + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


# 토큰이 유효하면 user_id를, 아니면 AuthError를 발생시킴
def verify_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise AuthError("로그인이 만료됐거나 유효하지 않아요")
    return payload["user_id"]


def get_user_info(user_id: int) -> dict:
    with get_connection() as conn:
        user_row = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
        settings_row = conn.execute(
            "SELECT health_mode, allergies FROM user_settings WHERE user_id = ?", (user_id,)
        ).fetchone()

    return {
        "email": user_row[0],
        "health_mode": settings_row[0] if settings_row else "none",
        "allergies": json.loads(settings_row[1]) if settings_row and settings_row[1] else [],
    }


def set_health_mode(user_id: int, health_mode: str):
    if health_mode not in VALID_HEALTH_MODES:
        raise AuthError(f"알 수 없는 모드예요: {health_mode}")

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_settings (user_id, health_mode) VALUES (?, ?)
            ON CONFLICT (user_id) DO UPDATE SET health_mode = excluded.health_mode
            """,
            (user_id, health_mode),
        )


# allergies: allergens.js의 ALLERGENS 라벨(예: "우유", "대두") 목록
def set_allergies(user_id: int, allergies: list[str]):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_settings (user_id, allergies) VALUES (?, ?)
            ON CONFLICT (user_id) DO UPDATE SET allergies = excluded.allergies
            """,
            (user_id, json.dumps(allergies)),
        )
