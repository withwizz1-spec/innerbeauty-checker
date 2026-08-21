// 성분 분류 사전
// category: 'functional'(기능성원료) | 'additive'(첨가물)
// 실제 사전 데이터(기능성원료/첨가물 목록)는 백엔드 DB로 이전됨(backend/ingredients.py)
// 앱 시작 시 setCategoryDict()로 한 번 받아와서 아래 categoryDict에 캐싱해서 씀

let categoryDict = {} // 예: { '비타민C': 'functional', '스테아린산마그네슘': 'additive', ... }

export function setCategoryDict(dict) {
  categoryDict = dict
}

// 이름 패턴 기반 추측 (사전에 없을 때 사용) — 첨가물 힌트
// 끝소리로만 매칭하면 놓치는 표기가 실제로 있었음:
//   '식용색소적색제40호'(색소로 안 끝남) / '결정셀룰로스'(오가 빠진 표기)
const ADDITIVE_PATTERNS = [
  /색소/, /향$/, /향료$/, /향분말$/, /스테아린산/, /셀룰로오?스/, /덱스트린$/,
  /검$/, /왁스$/, /배당체$/,
  // '향$'만으로는 '요구르트향분말'·'트로피칼후르츠믹스향분말'을 놓쳤음.
  // '향'을 통째로 넣지 않는 이유: '향신료'처럼 향료가 아닌 식품이 섞임
]

// 이름이 '향'으로 끝나지만 향료가 아니라 향신료(식품)인 예외.
// 전수 조사에서 2회뿐이라 실사용 영향은 작지만, 걸리면 명백한 오분류라 막아둠
const SPICE_NOT_FLAVORING = ['정향', '회향', '팔각향']

// 기능성원료 힌트 — 사전에 없어도 이름 형태만으로 확실히 알 수 있는 두 무리.
// 전수 조사(C003 44,691건)에서 미확인 성분을 빈도순으로 묶어보니 이 둘이 미확인의
// 19%를 차지했는데, 개별 이름을 사전에 넣는 것보다 패턴 한 줄이 훨씬 효율적이었음.
const FUNCTIONAL_PATTERNS = [
  // 프로바이오틱스 학명 — 원재료명에 라틴어 학명이 그대로 적히는 경우가 많음
  // (Lactobacillus 속이 2020년에 여러 속으로 재분류되어 표기가 다양함:
  //  Lactiplantibacillus / Lacticaseibacillus / Limosilactobacillus / Levilactobacillus …)
  /^(lacto|lacti|limosi|levi|ligi|latil|loigo|companil|furfuril|secundil|apilacto|paucilacto)/i,
  /^(bifido|strepto|bacillus|lactococcus|leuconostoc|pediococcus|weissella|enterococcus|saccharomyces|clostridium)/i,
  // L-아미노산 — L-아르지닌·L-카르니틴·L-프롤린 등.
  // D-/DL- 은 제외: 'D-말티톨'처럼 당알코올 감미료(첨가물)가 섞여 들어옴
  /^L-/,
]

// 제품의 "기능성"(PRIMARY_FNCLTY) 텍스트는 "[성분명]역할설명" 형태 — 식약처가 이
// 제품에 대해 공식으로 인정한 기능성원료가 대괄호 라벨로 명시되어 있음. 하드코딩
// 사전보다 신뢰도 높은 근거이므로 categorize()에서 최우선으로 확인함
function matchesPrimaryFnclty(primaryFnclty, name) {
  if (!primaryFnclty) return false
  const clean = name.replace(/\s/g, '')
  const labels = [...primaryFnclty.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].replace(/\s/g, ''))
  return labels.some((l) => clean.includes(l) || l.includes(clean))
}

// categoryDict에서 특정 분류(functional/additive)에 해당하는 이름이 포함되는지 확인
function matchDict(clean, wantedCategory) {
  return Object.entries(categoryDict).some(
    ([name, category]) => category === wantedCategory && clean.includes(name.replace(/\s/g, ''))
  )
}

// 성분 이름 하나를 분류 → 'functional' | 'additive' | 'unknown'
// 판정 순서: 이 제품의 공식 기능성 문구(primaryFnclty) 확인 → 첨가물 사전 → 기능성원료
// 사전(자체 추정) → 이름 패턴 추측 → 미확인
// * 첨가물 사전을 기능성원료 사전보다 먼저 보는 이유: '스테아린산마그네슘'처럼 기능성
//   미네랄(마그네슘) 이름을 포함하지만 실제로는 첨가물인 경우의 오분류를 막기 위함
export function categorize(name, primaryFnclty) {
  const clean = name.replace(/\s/g, '')

  if (matchesPrimaryFnclty(primaryFnclty, name)) {
    return 'functional'
  }
  if (matchDict(clean, 'additive')) {
    return 'additive'
  }
  if (matchDict(clean, 'functional')) {
    return 'functional'
  }
  // 사전에 없어도 형태로 알 수 있는 기능성원료(유산균 학명·L-아미노산).
  // 첨가물 사전·패턴보다 뒤에 두면 안전한 이유: 위 첨가물 사전을 이미 통과했고,
  // 아래 첨가물 패턴(색소/향/스테아린산 등)은 라틴어 학명·L- 접두와 겹치지 않음
  if (FUNCTIONAL_PATTERNS.some((p) => p.test(clean))) {
    return 'functional'
  }
  // 향신료는 '향'으로 끝나도 식품 — 아래 향료 패턴에 걸리기 전에 먼저 빼냄
  if (SPICE_NOT_FLAVORING.includes(clean)) {
    return 'base'
  }
  // 첨가물 이름 패턴을 식품 원료보다 먼저 확인 — '키위향'은 향료(첨가물)인데
  // 식품 원료 사전의 '키위'가 먼저 걸리면 식품으로 잘못 분류됨
  if (ADDITIVE_PATTERNS.some((p) => p.test(clean))) {
    return 'additive'
  }
  // 식품 원료는 마지막 — '대두'(base)가 '대두레시틴'(첨가물)을 가로채지 않도록 순서가 중요함
  if (matchDict(clean, 'base')) {
    return 'base'
  }
  return 'unknown'
}

export const CATEGORY_LABEL = {
  functional: '기능성원료',
  additive: '첨가물',
  base: '식품 원료',
  unknown: '미확인',
}

export const CATEGORY_ORDER = ['functional', 'additive', 'base', 'unknown']

// 브랜드 팔레트에 맞춘 분류색 — 미확인은 등급 시스템의 '미확인'(ingredientGrade.js GRADE_COLOR.unknown)과
// 동일한 회색을 써서, 앱 어디서든 "미확인 = 이 회색"이 되도록 통일
export const CATEGORY_COLOR = {
  functional: '#2f6f52', // 브랜드 그린 (--brand)
  additive: '#ff9a76', // 웜 코랄 (--accent-warm)
  base: '#5b7c99', // 회청색 — 평범한 식품 원료라 경고도 강조도 아닌 중립 톤
  unknown: '#75808f',
}
