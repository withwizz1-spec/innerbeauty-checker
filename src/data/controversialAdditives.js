// 국내외에서 안전성 논란이 있었던 첨가물 1차 목록
// "금지/불법"이 아니라 "이런 논란이 있었다"는 정보 제공 목적 — 국내에서는 대부분 허용 기준 내 사용 가능
export const CONTROVERSIAL_ADDITIVES = [
  {
    keywords: ['아스파탐'],
    reason: 'WHO 산하 IARC가 2023년 "발암 가능물질(2B군)"로 분류. 다만 1일섭취허용량(ADI) 내 섭취는 안전하다는 평가는 유지됨',
    source: 'WHO/IARC (2023)',
  },
  {
    keywords: ['이산화티타늄', '티타늄디옥사이드'],
    reason: 'EU는 2022년 유전독성 우려로 식품첨가물 사용을 전면 금지. 국내는 아직 사용 허용',
    source: 'EU 집행위 (2022)',
  },
  {
    keywords: ['아질산나트륨', '아질산염'],
    reason: '육류 가공품의 발색·보존에 쓰이지만, 고온 조리 시 체내에서 발암물질인 니트로소아민으로 전환될 수 있다는 우려가 있음',
    source: '국제 연구 다수',
  },
  {
    keywords: ['황색4호', '황색5호', '적색40호', '적색102호'],
    reason: '영국 식품기준청(FSA)의 2007년 연구에서 어린이 과잉행동 증가와의 연관성이 보고되어, EU에서는 해당 색소 함유 제품에 경고문구 표시를 의무화함',
    source: '영국 FSA (2007), EU',
  },
  {
    keywords: ['카라기난'],
    reason: '동물실험에서 장 염증을 유발할 수 있다는 우려가 제기되어 미국 소비자단체(CSPI) 등이 주의를 권고. 각국 규제기관의 공식 사용금지 조치는 없음',
    source: 'CSPI 등 소비자단체',
  },
  {
    keywords: ['부틸히드록시아니솔', 'BHA'],
    reason: 'IARC가 "발암 가능물질(2B군)"로 분류',
    source: 'IARC',
  },
]

// 성분명 하나를 검사 → 매칭된 논란 첨가물 정보(없으면 null)
export function matchControversial(name) {
  return CONTROVERSIAL_ADDITIVES.find((c) => c.keywords.some((k) => name.includes(k))) ?? null
}
