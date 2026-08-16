import { useMemo, useState } from 'react'
import { parseIngredients } from '../utils/parseIngredients'
import { findInteractions } from '../utils/findInteractions'
import FavoriteButton from './FavoriteButton'

const TYPE_STYLE = {
  synergy: { icon: '🤝', label: '좋은 조합', className: 'combo-synergy' },
  caution: { icon: '⏳', label: '시간차 섭취 권장', className: 'combo-caution' },
}

// 찜한 제품 목록 — 함께 먹는 것들만 골라 체크하면 그 조합의 궁합을 보여줌
// (영양제를 항상 다 같이 먹는 건 아니라서, 전체가 아니라 '선택한 것들'끼리 비교함)
function FavoritesView({ favorites, interactions, onSelect, onToggleFavorite }) {
  const items = useMemo(
    () => [...favorites.entries()].map(([key, product]) => ({ key, product })),
    [favorites]
  )

  // 기본값은 전체 선택 — 처음 들어왔을 때 바로 결과가 보이도록
  const [selected, setSelected] = useState(() => new Set(items.map((i) => i.key)))

  function toggleSelected(key) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // 선택한 제품들의 원재료를 한 덩어리로 합쳐 상호작용을 찾음.
  // 어느 제품에서 온 성분인지 알아야 안내가 되므로 제품명을 함께 붙여둠
  const found = useMemo(() => {
    const picked = items.filter((i) => selected.has(i.key))
    const ingredients = picked.flatMap((i) =>
      parseIngredients(i.product.RAWMTRL_NM, i.product.PRIMARY_FNCLTY).map((ing) => ({
        ...ing,
        productName: i.product.PRDLST_NM,
      }))
    )
    return findInteractions(ingredients, interactions)
  }, [items, selected, interactions])

  const selectedCount = selected.size

  if (items.length === 0) {
    return (
      <p className="filter-empty">
        아직 찜한 제품이 없어요. 검색 결과에서 ♡를 눌러 담아보세요.
      </p>
    )
  }

  return (
    <>
      <p className="favorites-hint">
        함께 먹는 제품만 골라서 체크하면, 그 조합의 궁합을 확인할 수 있어요.
      </p>

      <ul className="favorites-list">
        {items.map(({ key, product }) => (
          <li key={key} className="favorite-row">
            <label className="favorite-check">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggleSelected(key)}
              />
              <span />
            </label>

            <button type="button" className="favorite-info" onClick={() => onSelect(product)}>
              <span className="result-biz">{product.BSSH_NM}</span>
              <strong className="result-title">{product.PRDLST_NM}</strong>
            </button>

            <FavoriteButton favorited onToggle={() => onToggleFavorite(product)} />
          </li>
        ))}
      </ul>

      <section className="combo-section">
        <div className="page-head" style={{ marginBottom: '0.75rem' }}>
          <span className="page-label">
            선택한 제품
            <span className="page-label-sep"> · </span>
            <strong className="page-label-count">{selectedCount}개</strong>
          </span>
        </div>

        {selectedCount < 2 ? (
          <p className="combo-empty">제품을 2개 이상 선택하면 궁합을 확인할 수 있어요.</p>
        ) : found.length === 0 ? (
          <p className="combo-empty">
            선택한 제품들 사이에서 알려진 상호작용은 발견되지 않았어요.
            <br />
            <span className="combo-note">
              상호작용 사전에 등록된 조합만 확인합니다. 없다고 해서 반드시 안전한 건 아니에요.
            </span>
          </p>
        ) : (
          <div className="combo-list">
            {found.map((item, i) => {
              const style = TYPE_STYLE[item.type]
              return (
                <div key={i} className={`combo-card ${style.className}`}>
                  <div className="combo-head">
                    <span className="combo-badge">
                      {style.icon} {style.label}
                    </span>
                    <span className="combo-pair">
                      {item.aMatched.join(', ')} ↔ {item.bMatched.join(', ')}
                    </span>
                  </div>
                  <p className="combo-desc">{item.description}</p>
                  {item.source && <p className="combo-source">출처: {item.source}</p>}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default FavoritesView
