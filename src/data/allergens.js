// 식약처 지정 알레르기 유발물질 표시 대상 (2026 기준 21종)
// 원본 성분명이 이 목록의 어느 키워드를 포함하면 해당 알레르기 유발물질로 간주
// 출처: 식품안전나라(foodsafetykorea.go.kr) 알레르기 유발물질 표시 안내
// 참고: 2026년 참깨·들깨 추가(24종) 개정이 논의 중이므로, 주기적으로 확인 필요
export const ALLERGENS = [
  { label: '알류', keywords: ['난백', '난황', '달걀', '계란분말', '전란분말'] },
  { label: '우유', keywords: ['우유', '유단백', '유청', '탈지분유', '전지분유', '카제인', '유당'] },
  { label: '메밀', keywords: ['메밀'] },
  { label: '땅콩', keywords: ['땅콩'] },
  { label: '대두', keywords: ['대두', '콩단백', '대두유', '레시틴'] },
  { label: '밀', keywords: ['밀가루', '밀전분', '소맥분', '글루텐', '밀배아'] },
  { label: '잣', keywords: ['잣'] },
  { label: '호두', keywords: ['호두'] },
  { label: '게', keywords: ['게살', '게추출물'] },
  { label: '새우', keywords: ['새우'] },
  { label: '오징어', keywords: ['오징어'] },
  { label: '고등어', keywords: ['고등어'] },
  { label: '조개류(굴·전복·홍합)', keywords: ['굴', '전복', '홍합', '조개'] },
  { label: '복숭아', keywords: ['복숭아'] },
  { label: '토마토', keywords: ['토마토'] },
  { label: '닭고기', keywords: ['닭고기', '계육'] },
  { label: '돼지고기', keywords: ['돼지고기', '돈육'] },
  { label: '쇠고기', keywords: ['쇠고기', '소고기', '우육'] },
  { label: '아황산류', keywords: ['아황산', '이산화황', '메타중아황산'] },
]

// 성분명 하나를 검사 → 매칭된 알레르기 유발물질 라벨 목록
export function matchAllergens(name) {
  return ALLERGENS.filter((a) => a.keywords.some((k) => name.includes(k))).map((a) => a.label)
}
