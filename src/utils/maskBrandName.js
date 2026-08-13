// 제품명 앞 브랜드 토큰의 가운데 글자를 가려서 노출 — 예: "비비랩 콜라겐" → "비X랩 콜라겐"
// 홈 화면 미리보기 카드는 사용자가 요청하지 않은 예시라, 특정 브랜드를 실명으로 노출하지 않기 위함
// (실제 검색 결과 화면에는 적용하지 않음)
export function maskBrandName(productName) {
  if (!productName) return productName

  const [brand, ...rest] = productName.split(' ')
  if (!brand || brand.length < 2) return productName

  const masked =
    brand.length === 2 ? brand[0] + 'X' : brand[0] + 'X'.repeat(brand.length - 2) + brand[brand.length - 1]

  return [masked, ...rest].join(' ')
}
