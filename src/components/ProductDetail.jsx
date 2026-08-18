import { useState } from 'react'
import { parseIngredients } from '../utils/parseIngredients'
import { CATEGORY_LABEL, CATEGORY_COLOR } from '../data/ingredientCategory'
import { GRADE_ICON } from '../data/ingredientGrade'
import IngredientInteractions from './IngredientInteractions'
import IngredientWarnings from './IngredientWarnings'
import IngredientConceptInfo from './IngredientConceptInfo'
import ProductSummary from './ProductSummary'
import FavoriteButton from './FavoriteButton'

// 분류별 칩 색상 — CATEGORY_COLOR(분류 바와 동일한 브랜드 색)에서 배경 10% 톤을 파생
// 같은 분류는 어디서나(요약, 원재료 칩) 같은 색을 쓰도록 한 곳에서 계산
const CATEGORY_STYLE = Object.fromEntries(
  Object.entries(CATEGORY_COLOR).map(([cat, color]) => [cat, { background: `${color}1a`, color }])
)

// 제품 상세 정보 한 줄 (라벨 위 / 값 아래) — InfoGrid 안에서만 쓰임
function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}

const CHIP_LIMIT = 10

function IngredientChips({ items, modeWarnings, myAllergies, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {items.map((ing, i) => {
        const modeWarningReason = modeWarnings[ing.name]
        const myAllergyHit = ing.allergens.some((a) => myAllergies.includes(a))

        return (
          <button
            key={i}
            type="button"
            className="chip"
            onClick={() => onSelect(ing)}
            style={{
              ...CATEGORY_STYLE[ing.category],
              ...(ing.grade === 'warning' ? { boxShadow: '0 0 0 1.5px #d03b3b' } : {}),
              ...(modeWarningReason ? { boxShadow: '0 0 0 1.5px #8a3ffc', background: '#f3ecff' } : {}),
              ...(myAllergyHit ? { boxShadow: '0 0 0 2px #d03b3b', background: '#fff1f0' } : {}),
            }}
          >
            {myAllergyHit && '🚫 '}
            {modeWarningReason && '🔔 '}
            {GRADE_ICON[ing.grade]} {ing.name}
          </button>
        )
      })}
    </div>
  )
}

// 원재료 전체 목록 — 분류별로 쪼개지 않고 한 덩어리로 보여주되, 확인이 필요한 성분을 앞으로 정렬
// (분류별 구간을 나누면 같은 성분이 위 경고 패널과 아래 칩에 흩어져 두 번 읽히게 됨)
function IngredientChipList({ ingredients, modeWarnings, myAllergies, onSelect }) {
  const [expanded, setExpanded] = useState(false)

  const sorted = [...ingredients].sort((a, b) => {
    const score = (ing) => (ing.grade === 'warning' ? 0 : ing.category === 'unknown' ? 1 : 2)
    return score(a) - score(b)
  })

  const visible = expanded ? sorted : sorted.slice(0, CHIP_LIMIT)
  const hiddenCount = sorted.length - visible.length

  return (
    <>
      <IngredientChips
        items={visible}
        modeWarnings={modeWarnings}
        myAllergies={myAllergies}
        onSelect={onSelect}
      />
      {hiddenCount > 0 && (
        <button type="button" className="btn-plain chip-more" onClick={() => setExpanded(true)}>
          + {hiddenCount}개 더보기
        </button>
      )}
    </>
  )
}

// 상세 페이지 제품 이미지 — 실제 이미지가 있을 때만 렌더링.
// C003(건강기능식품)에는 이미지 필드 자체가 없어서, 플레이스홀더를 두면 항상 빈 상자만 남음
function ProductImage({ src }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null

  return (
    <div className="product-image-box">
      <img src={src} alt="" onError={() => setFailed(true)} />
    </div>
  )
}

function ProductDetail({
  product,
  modeWarnings = {},
  myAllergies = [],
  interactions = [],
  onSelectIngredient,
  favorited = false,
  onToggleFavorite,
}) {
  const ingredients = parseIngredients(product.RAWMTRL_NM, product.PRIMARY_FNCLTY)

  const counts = {
    functional: ingredients.filter((i) => i.category === 'functional').length,
    additive: ingredients.filter((i) => i.category === 'additive').length,
    unknown: ingredients.filter((i) => i.category === 'unknown').length,
  }
  // 분류 구성은 별도 바 대신 한 줄 요약으로 — 등급 바와 축이 달라 나란히 두면 헷갈림
  const compositionText = ['functional', 'additive', 'unknown']
    .filter((cat) => counts[cat] > 0)
    .map((cat) => `${CATEGORY_LABEL[cat]} ${counts[cat]}`)
    .join(' · ')

  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* 1. 제품 정보 — 업체명을 제품명 위 mono로 (검색 결과 카드와 같은 문법) */}
      <div className="card">
        <span className="result-biz">{product.BSSH_NM}</span>
        <div className="product-title-row">
          <h2 className="product-name">{product.PRDLST_NM}</h2>
          {onToggleFavorite && (
            <FavoriteButton favorited={favorited} onToggle={onToggleFavorite} size="lg" />
          )}
        </div>

        {/* _source가 있으면 fallback(일반식품·HACCP·수입식품)에서 온 건강보조식품 */}
        <div style={{ marginTop: '0.5rem' }}>
          <span className={`outline-badge ${product._source ? 'supplement' : 'certified'}`}>
            {product._source ? '건강보조식품' : '건강기능식품'}
          </span>
        </div>

        {/* 식약처가 이 제품에 대해 직접 인정한 기능성 문구 — 핵심 근거라 강조 박스로 구분 */}
        {product.PRIMARY_FNCLTY && (
          <div className="fnclty-callout">
            <p className="fnclty-label">✅ 식약처 인정 기능성</p>
            <p className="fnclty-text">{product.PRIMARY_FNCLTY}</p>
          </div>
        )}

        <ProductImage src={product.IMAGE_URL} />
      </div>

      {/* 2. 숫자 요약 + 등급 바 */}
      <ProductSummary ingredients={ingredients} />

      {/* 3. 확인이 필요한 성분 — 해당 성분이 있을 때만 카드가 생김 */}
      <IngredientWarnings ingredients={ingredients} asCard />

      {/* 4. 원재료 전체 + 성분 간 상호작용 */}
      {ingredients.length > 0 && (
        <div className="card">
          <IngredientConceptInfo title={`원재료 ${ingredients.length}개`} />
          <p className="composition-line">{compositionText}</p>

          <IngredientChipList
            ingredients={ingredients}
            modeWarnings={modeWarnings}
            myAllergies={myAllergies}
            onSelect={onSelectIngredient}
          />

          <IngredientInteractions ingredients={ingredients} interactions={interactions} />
        </div>
      )}

      {/* 5. 제품 상세 정보 */}
      <div className="card">
        <h3 className="section-title">
          <span className="capsule-dot" />
          제품 상세 정보
        </h3>
        <div className="info-grid">
          <InfoRow label="식품유형" value={product.PRDKIND} />
          <InfoRow label="알레르기 유발물질" value={product.ALLERGY_INFO} />
          <InfoRow label="영양성분" value={product.NUTRIENT_INFO} />
          <InfoRow label="제조국" value={product.MANUF_COUNTRY} />
          <InfoRow label="해외 제조업소" value={product.OVERSEAS_MANUFACTURER} />
          <InfoRow label="섭취방법" value={product.NTK_MTHD} />
          <InfoRow label="섭취 시 주의사항" value={product.IFTKN_ATNT_MATR_CN} />
          <InfoRow label="보관방법" value={product.CSTDY_MTHD} />
          <InfoRow label="유통기한" value={product.POG_DAYCNT} />
          <InfoRow label="성상" value={product.DISPOS} />
          <InfoRow label="기준 및 규격" value={product.STDR_STND} />
          <InfoRow label="신고번호" value={product.PRDLST_REPORT_NO} />
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
