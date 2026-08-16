import { useState } from 'react'
import { parseIngredients } from '../utils/parseIngredients'
import { GRADE_ICON } from '../data/ingredientGrade'
import { buildProductKey } from '../utils/productKey'
import FavoriteButton from './FavoriteButton'

// 제품 썸네일 — IMAGE_URL(HACCP 공식 이미지)이 있으면 그대로 쓰고,
// 없으면(대부분의 C003 결과) 건강기능식품/건강보조식품 여부로 색이 다른 캡슐 아이콘을 대신 보여줌
// (네이버쇼핑 이미지 보강은 안정적으로 이미지를 못 가져와서 리스트에서는 더 이상 시도하지 않음)
function ProductThumb({ src, isSupplement }) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div className={`result-thumb-box ${isSupplement ? 'supplement' : 'certified'}`}>
      <span className="result-thumb-icon" />
    </div>
  )
}

// 리스트에서 보여줄 핵심 성분 최대 3개 — 경고 등급을 먼저, 그다음 기능성원료 순으로 채움
// (긴 공식 기능성 문구 대신 한눈에 훑을 수 있는 해시태그 형태로)
function pickHighlightIngredients(product) {
  if (!product.RAWMTRL_NM) return []

  const parsed = parseIngredients(product.RAWMTRL_NM, product.PRIMARY_FNCLTY)
  const ordered = [
    ...parsed.filter((i) => i.grade === 'warning'),
    ...parsed.filter((i) => i.category === 'functional'),
    ...parsed,
  ]

  const seen = new Set()
  const picked = []
  for (const ing of ordered) {
    if (picked.length >= 3) break
    if (seen.has(ing.name)) continue
    seen.add(ing.name)
    picked.push(ing)
  }
  return picked
}

function ProductList({ products, onSelect, favorites, onToggleFavorite }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {products.map((p) => {
        const chips = pickHighlightIngredients(p)
        return (
          <li key={p.PRDLST_REPORT_NO} onClick={() => onSelect(p)} className="result-card">
            <ProductThumb src={p.IMAGE_URL} isSupplement={!!p._source} />
            <div style={{ minWidth: 0 }}>
              <div className="result-eyebrow-row">
                <span className="result-biz">{p.BSSH_NM}</span>
                {p._source && <span className="result-badge">건강보조식품</span>}
              </div>
              <strong className="result-title">{p.PRDLST_NM}</strong>

              {chips.length > 0 && (
                <div className="result-chip-row">
                  {chips.map((ing, i) => (
                    <span key={i} className={`tag-chip ${ing.grade === 'warning' ? 'warning' : ''}`}>
                      {ing.grade === 'warning' ? `${GRADE_ICON.warning} ` : '#'}
                      {ing.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {onToggleFavorite && (
              <FavoriteButton
                favorited={favorites?.has(buildProductKey(p)) ?? false}
                onToggle={() => onToggleFavorite(p)}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default ProductList
