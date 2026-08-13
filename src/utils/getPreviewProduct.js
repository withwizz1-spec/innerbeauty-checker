import { searchProducts, searchSupplementFallback } from '../api/foodSafetyApi'

// 홈 화면 히어로의 "실제 확인 화면 미리보기" 카드용 — 사용자가 검색하기 전에도
// 유명 브랜드 키워드로 실제 검색을 돌려 진짜 제품 하나를 가져옴 (제품명은 이후 마스킹해서 노출)
const PREVIEW_BRAND_KEYWORDS = ['비비랩', '락토핏', '이너랩', '닥터린']

export async function fetchPreviewProduct() {
  for (const keyword of PREVIEW_BRAND_KEYWORDS) {
    try {
      const data = await searchProducts(keyword)
      if (data?.products?.length > 0) return data.products[0]
    } catch {
      // 이 키워드 조회 실패 — 다음 키워드로 계속
    }

    try {
      const fallback = await searchSupplementFallback(keyword)
      if (fallback.products.length > 0) return fallback.products[0]
    } catch {
      // 다음 키워드로 계속
    }
  }
  return null
}
