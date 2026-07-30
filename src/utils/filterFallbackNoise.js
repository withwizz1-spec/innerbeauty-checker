// fallback 소스(C002·HACCP·수입식품)는 "건강보조식품 DB"가 아니라 "모든 가공식품 DB"라서,
// 키워드로 검색하면 반찬·과자·음료 등 전혀 무관한 결과가 섞여 들어옴.
// 실제 API 응답을 확인해 검증한 필터 기준:
//   - HACCP(prdkind)·C002(PRDLST_DCNM)는 식품유형 필드로 명백한 비건강보조식품 카테고리를 제외
//   - 수입식품은 DCL_PRDUCT_SE_CD_NM(신고구분)이 "건강기능식품"인지로 직접 판별 가능 (가장 정밀)

// 식품유형에 이 키워드가 포함되면 건강보조식품일 가능성이 낮음
// 예: "오메가3" 검색 시 가공버터·저지방가공유·수산물가공품·가공유가 섞이는 문제,
//     "유산균" 검색 시 과자·초콜릿가공품·가공유가 섞이는 문제를 여기서 걸러냄
// 식품유형은 "과자류" 대신 "과자"만, "초콜릿가공품" 대신 "초콜릿"만 쓰는 식으로 짧은 어근을 사용함
// — 실제 API 값이 "준초콜릿"·"과자"처럼 접미사가 다르게 오는 경우가 있어, 어근으로 넓게 잡아야 놓치지 않음
const NON_SUPPLEMENT_FOOD_TYPE_KEYWORDS = [
  '가공유', '발효유', '저지방', '아이스크림', '빙과', '버터', '마가린', '치즈',
  '유산균음료', '탄산음료', '과채음료', '두유', '혼합음료', '다류', '커피',
  '빵', '떡', '과자', '캔디', '추잉껌', '초콜릿', '코코아',
  '탁주', '약주', '청주', '맥주', '소주', '위스키', '브랜디', '증류주', '리큐르', '과실주',
  '수산물가공품', '젓갈', '조미김', '식육가공품', '알가공품',
  '김치', '장아찌', '절임', '장류', '조미식품',
  '즉석섭취식품', '즉석조리식품', '신선편의식품', '이유식',
]

// 식품유형이 "기타가공품"처럼 애매해도, 제품명에 이 패턴이 있으면 반찬·간식류로 판단해 제외
// 예: "유산균이 첨가된 연근부각" — 식품유형은 '기타가공품'이라 위 목록만으론 못 거름
const DISH_NAME_PATTERN = /부각|샌드|파이|초코볼|쇼콜라|막걸리|만두|젓갈|장아찌|볶음|조림|무침|찌개|반찬|나물|육수|짜장|라면|국수|우동/

// HACCP(prdkind → PRDKIND로 매핑됨)·C002(PRDLST_DCNM)에 적용
// 식품유형 값에 공백이 들어있는 경우가 있어(예: "유산균 음료") 비교 전에 공백을 제거
export function isLikelySupplement(product) {
  const foodType = (product.PRDKIND ?? product.PRDLST_DCNM ?? '').replace(/\s/g, '')
  if (NON_SUPPLEMENT_FOOD_TYPE_KEYWORDS.some((k) => foodType.includes(k))) return false
  if (DISH_NAME_PATTERN.test(product.PRDLST_NM ?? '')) return false
  return true
}

// 수입식품 원본 아이템에 적용 — DCL_PRDUCT_SE_CD_NM(신고구분)이 "건강기능식품"인 것만 통과
// 위 식품유형 방식보다 근거가 명확해서(공식 신고 구분값) 별도 기준으로 분리
export function isDeclaredHealthImport(rawItem) {
  return (rawItem.DCL_PRDUCT_SE_CD_NM ?? '').includes('건강기능식품')
}
