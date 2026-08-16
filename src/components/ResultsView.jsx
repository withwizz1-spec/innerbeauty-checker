import { useMemo, useState } from 'react'
import { parseIngredients } from '../utils/parseIngredients'
import ProductList from './ProductList'
import ResultFilters from './ResultFilters'

// 제품 하나의 원재료를 한 번만 분석해서 필터·정렬에 필요한 수치로 요약
// (카드 렌더링과 별개로 목록 전체에 대해 미리 계산해둠)
function summarize(product, myAllergies) {
  const parsed = parseIngredients(product.RAWMTRL_NM, product.PRIMARY_FNCLTY)
  const allergenHits = parsed.flatMap((i) => i.allergens ?? [])

  return {
    isCertified: !product._source,
    // '낯선 원료' = 공식 기능성 문구에도 없고 분류 사전에도 없어 자동 분류가 안 된 원료
    unknownCount: parsed.filter((i) => i.category === 'unknown').length,
    warningCount: parsed.filter((i) => i.grade === 'warning').length,
    // 개인 알레르기를 설정했으면 그 목록 기준, 아니면 표시대상 21종 전체 기준
    hasAllergen: myAllergies.length
      ? allergenHits.some((a) => myAllergies.includes(a))
      : allergenHits.length > 0,
  }
}

function ResultsView({ products, myAllergies = [], onSelect, favorites, onToggleFavorite }) {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('relevance')

  const stats = useMemo(() => {
    const map = new Map()
    products.forEach((p) => map.set(p, summarize(p, myAllergies)))
    return map
  }, [products, myAllergies])

  const counts = useMemo(
    () => ({
      all: products.length,
      certified: products.filter((p) => stats.get(p).isCertified).length,
      unknown: products.filter((p) => stats.get(p).unknownCount > 0).length,
      noAllergy: products.filter((p) => !stats.get(p).hasAllergen).length,
    }),
    [products, stats]
  )

  const visible = useMemo(() => {
    const filtered = products.filter((p) => {
      const s = stats.get(p)
      if (filter === 'certified') return s.isCertified
      if (filter === 'unknown') return s.unknownCount > 0
      if (filter === 'noAllergy') return !s.hasAllergen
      return true
    })

    // 정확도순은 식약처가 준 순서를 그대로 두는 것 — 정렬하지 않음
    if (sort === 'relevance') return filtered
    return [...filtered].sort((a, b) =>
      sort === 'unknownDesc'
        ? stats.get(b).unknownCount - stats.get(a).unknownCount
        : stats.get(a).warningCount - stats.get(b).warningCount
    )
  }, [products, stats, filter, sort])

  return (
    <>
      <ResultFilters
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        counts={counts}
      />

      {visible.length === 0 ? (
        <p className="filter-empty">
          이 조건에 맞는 제품이 없어요. 다른 필터를 눌러보세요.
        </p>
      ) : (
        <ProductList
          products={visible}
          onSelect={onSelect}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </>
  )
}

export default ResultsView
