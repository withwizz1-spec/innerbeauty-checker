// 상호작용 사전을 제품의 원재료 목록과 대조해, 양쪽 성분이 모두 들어있는 조합만 찾음

// 성분 이름(공백 제거)에 키워드가 포함되는지 — 분류/알레르기 매칭과 같은 방식
function matchNames(ingredients, keywords) {
  const cleanKeywords = keywords.map((k) => k.replace(/\s/g, ''))
  return ingredients
    .filter((ing) => {
      const clean = ing.name.replace(/\s/g, '')
      return cleanKeywords.some((k) => clean.includes(k))
    })
    .map((ing) => ing.name)
}

export function findInteractions(ingredients, interactions) {
  return interactions
    .map((item) => {
      const aMatched = matchNames(ingredients, item.a_keywords)
      const bMatched = matchNames(ingredients, item.b_keywords)
      return { ...item, aMatched, bMatched }
    })
    .filter(
      (item) =>
        item.aMatched.length > 0 &&
        item.bMatched.length > 0 &&
        // 같은 원재료 하나가 양쪽에 모두 걸린 경우는 조합이 아님
        !(item.aMatched.length === 1 && item.bMatched.length === 1 && item.aMatched[0] === item.bMatched[0])
    )
}
