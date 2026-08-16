const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP 오류: ${res.status}`);
  return data;
}

export async function fetchFavorites(token) {
  const res = await fetch(`${BACKEND_URL}/api/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function addFavorite(token, product) {
  const res = await fetch(`${BACKEND_URL}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ product }),
  });
  return handleResponse(res);
}

export async function removeFavorite(token, productKey) {
  // 키에 한글·공백·| 가 섞여 있어서 경로에 넣기 전 인코딩 필요
  const res = await fetch(`${BACKEND_URL}/api/favorites/${encodeURIComponent(productKey)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
