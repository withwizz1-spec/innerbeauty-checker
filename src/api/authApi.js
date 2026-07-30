const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP 오류: ${res.status}`);
  return data;
}

export async function signup(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function fetchMe(token) {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

// health_mode·allergies 중 넘긴 값만 한 번에 저장 (개인화 설정 화면의 '저장' 버튼에서 사용)
export async function updateSettings(token, { health_mode, allergies } = {}) {
  const res = await fetch(`${BACKEND_URL}/api/auth/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ health_mode, allergies }),
  });
  return handleResponse(res);
}

// 특정 모드(임산부/노인 등)의 주의 성분 사전 조회 — 로그인 불필요한 공개 데이터
export async function fetchModeWarnings(mode) {
  if (mode === 'none') return {};
  const res = await fetch(`${BACKEND_URL}/api/mode-warnings?mode=${mode}`);
  return handleResponse(res);
}
