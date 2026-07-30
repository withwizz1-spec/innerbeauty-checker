const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// 성분 분류 사전 전체 조회 (앱 시작 시 한 번만 호출해서 캐싱해서 씀)
export async function fetchIngredientCategories() {
  const res = await fetch(`${BACKEND_URL}/api/ingredients/categories`);
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
  return res.json();
}

// 성분 간 상호작용 사전 전체 조회 (앱 시작 시 한 번만 호출해서 캐싱해서 씀)
export async function fetchInteractions() {
  const res = await fetch(`${BACKEND_URL}/api/interactions`);
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
  return res.json();
}

// 오분류 신고 제출
export async function reportMisclassification({ name, suggestedCategory, reason }) {
  const res = await fetch(`${BACKEND_URL}/api/ingredients/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, suggested_category: suggestedCategory, reason }),
  });
  if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
  return res.json();
}
