// 제품의 "기능성"(PRIMARY_FNCLTY) 텍스트는 "[성분명]역할 설명" 형태로 되어 있음
// 예: "[비타민C]①결합조직 형성에 필요②철의 흡수에 필요 [아연]①정상적인 면역기능에 필요"
// 여기서 특정 성분명에 해당하는 역할 설명만 뽑아냄 (식약처가 공식 제공하는 텍스트를 그대로 활용)
export function extractIngredientRole(primaryFnclty, ingredientName) {
  if (!primaryFnclty) return null

  const clean = ingredientName.replace(/\s/g, '')
  const segments = [...primaryFnclty.matchAll(/\[([^\]]+)\]([^[]*)/g)]

  const matched = segments.find(([, label]) => {
    const l = label.replace(/\s/g, '')
    return l.includes(clean) || clean.includes(l)
  })

  return matched ? matched[2].trim() : null
}
