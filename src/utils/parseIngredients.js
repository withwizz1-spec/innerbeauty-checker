import { categorize } from '../data/ingredientCategory'
import { matchAllergens } from '../data/allergens'
import { matchControversial } from '../data/controversialAdditives'
import { gradeIngredient } from '../data/ingredientGrade'

// 원재료명 원본 텍스트(콤마로 나열된 한 줄)를 개별 성분 리스트로 분리
// primaryFnclty(제품의 공식 기능성 문구)를 함께 넘기면, 그 문구에 명시된 성분을
// 하드코딩 사전보다 우선해서 기능성원료로 판정함 (categorize 참고)
// 예: "비타민C(L-Ascorbic acid), 산화아연" → [{ name: '비타민C', detail: 'L-Ascorbic acid', category: 'functional' }, ...]
export function parseIngredients(rawmtrlNm, primaryFnclty) {
  if (!rawmtrlNm) return []

  return splitTopLevel(rawmtrlNm).map((item) => {
    const match = item.match(/^(.+?)\(([\s\S]+)\)$/)
    const name = match ? match[1].trim() : item
    const detail = match ? match[2].trim() : null
    const category = categorize(name, primaryFnclty)
    const allergens = matchAllergens(name)
    const controversial = matchControversial(name)
    return {
      name,
      detail,
      category,
      allergens,
      controversial,
      grade: gradeIngredient({ category, allergens, controversial }),
    }
  })
}

// 괄호 안의 콤마는 무시하고, 괄호 밖(최상위)의 콤마 기준으로만 분리
// "포도과즙분말(포도과즙 90%, 말토덱스트린 9.6%)"가 하나의 성분으로 유지되도록 괄호 깊이를 추적
function splitTopLevel(text) {
  const result = []
  let depth = 0
  let current = ''

  for (const char of text) {
    if (char === '(') depth++
    if (char === ')') depth--

    if (char === ',' && depth === 0) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) result.push(current.trim())

  return result.filter(Boolean)
}
