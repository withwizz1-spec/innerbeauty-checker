// 성분 등급 판정 — "위험하다"가 아니라 "확인된 사유가 있는지"를 기준으로 함
// 첨가물이라서 낮은 등급을 받지는 않음 (기능성원료/첨가물 모두 자체 안전성 심사를 통과한 성분)
export const GRADE_LABEL = {
  warning: '경고',
  safe: '안전',
  unknown: '미확인',
}

// 등급은 색만으로 구분하지 않음(색각이상 대비) — 어디서든 아이콘·라벨을 함께 표기
export const GRADE_ICON = {
  warning: '⚠️',
  safe: '✅',
  unknown: '❓',
}

// 상태색 — CVD/대비 검증 통과 값 (미확인은 의도적 무채색: 위험 신호가 아니라 "판정 불가")
export const GRADE_COLOR = {
  warning: '#d03b3b',
  safe: '#0ca30c',
  unknown: '#75808f',
}

// 표시 우선순위 — 경고를 맨 앞에 (이 앱에서 가장 먼저 봐야 하는 정보)
export const GRADE_ORDER = ['warning', 'safe', 'unknown']

export function gradeIngredient({ category, allergens, controversial }) {
  if (allergens.length > 0 || controversial) return 'warning'
  if (category === 'unknown') return 'unknown'
  return 'safe'
}
