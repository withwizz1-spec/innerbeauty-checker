import { useState } from 'react'
import { useNaverImage } from '../hooks/useNaverImage'
import { parseIngredients } from '../utils/parseIngredients'
import { CATEGORY_LABEL, CATEGORY_COLOR } from '../data/ingredientCategory'
import { GRADE_ICON } from '../data/ingredientGrade'
import IngredientCategoryBar from './IngredientCategoryBar'
import IngredientGradeBar from './IngredientGradeBar'
import IngredientInteractions from './IngredientInteractions'
import IngredientWarnings from './IngredientWarnings'
import IngredientConceptInfo from './IngredientConceptInfo'
import FavoriteButton from './FavoriteButton'

// 분류별 칩 색상 — CATEGORY_COLOR(분류 바와 동일한 브랜드 색)에서 배경 10% 톤을 파생
// 같은 분류는 어디서나(분류 바, 원재료 칩) 같은 색을 쓰도록 한 곳에서 계산
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

const CHIP_LIMIT = 8

// 카테고리 하나(기능성원료/첨가물/미확인)의 칩 목록 — 성분이 많으면 8개까지만 보여주고 "더보기"로 펼침
// 접힌 상태에서도 경고 등급 성분이 가려지지 않도록 항상 앞쪽에 정렬
function IngredientChipGroup({ items, modeWarnings, myAllergies, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...items].sort((a, b) => (a.grade === 'warning' ? -1 : 0) - (b.grade === 'warning' ? -1 : 0))
  const visible = expanded ? sorted : sorted.slice(0, CHIP_LIMIT)
  const hiddenCount = sorted.length - visible.length

  return (
    <>
      <IngredientChips items={visible} modeWarnings={modeWarnings} myAllergies={myAllergies} onSelect={onSelect} />
      {hiddenCount > 0 && (
        <button type="button" className="btn-plain chip-more" onClick={() => setExpanded(true)}>
          + {hiddenCount}개 더보기
        </button>
      )}
    </>
  )
}

function IngredientChips({ items, modeWarnings, myAllergies, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {items.map((ing, i) => {
        const modeWarningReason = modeWarnings[ing.name]
        const myAllergyHit = ing.allergens.some((a) => myAllergies.includes(a))
        const tooltip = [
          ing.detail,
          ing.allergens.length > 0 ? `알레르기 유발물질: ${ing.allergens.join(', ')}` : null,
          myAllergyHit ? '내가 등록한 알레르기 유발물질과 일치해요' : null,
          ing.controversial ? `해외 논란 참고용: ${ing.controversial.reason}` : null,
          modeWarningReason ? `개인화 모드 주의: ${modeWarningReason}` : null,
        ]
          .filter(Boolean)
          .join(' / ')

        return (
          <button
            key={i}
            type="button"
            className="chip"
            onClick={() => onSelect(ing)}
            title={tooltip || undefined}
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

function IngredientList({ rawmtrlNm, primaryFnclty, modeWarnings, myAllergies, interactions, onSelectIngredient }) {
  if (!rawmtrlNm) return null
  const ingredients = parseIngredients(rawmtrlNm, primaryFnclty)

  // 분류별로 묶기
  const groups = {
    functional: ingredients.filter((i) => i.category === 'functional'),
    additive: ingredients.filter((i) => i.category === 'additive'),
    unknown: ingredients.filter((i) => i.category === 'unknown'),
  }

  const counts = {
    functional: groups.functional.length,
    additive: groups.additive.length,
    unknown: groups.unknown.length,
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <IngredientConceptInfo title={`원재료 (${ingredients.length}개)`} />

      <IngredientGradeBar ingredients={ingredients} />

      <IngredientWarnings ingredients={ingredients} />

      <IngredientInteractions ingredients={ingredients} interactions={interactions} />

      {/* 분류(기능성원료/첨가물) 구성비는 안전성 정보보다 보조적이라 아래로 배치 */}
      <IngredientCategoryBar counts={counts} total={ingredients.length} />

      <div style={{ marginTop: '1rem' }}>
      {['functional', 'additive', 'unknown'].map((cat) =>
        groups[cat].length === 0 ? null : (
          <div key={cat} style={{ marginBottom: '0.75rem' }}>
            <p style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', color: '#888' }}>
              {CATEGORY_LABEL[cat]} {groups[cat].length}개
            </p>
            <IngredientChipGroup
              items={groups[cat]}
              modeWarnings={modeWarnings}
              myAllergies={myAllergies}
              onSelect={onSelectIngredient}
            />
          </div>
        )
      )}
      </div>
    </div>
  )
}

// 상세 페이지 제품 이미지 — IMAGE_URL(HACCP 공식 이미지)이 없으면 네이버쇼핑으로 보강.
// 그래도 없거나 로드 실패하면 박스 자체는 항상 보여줌(플레이스홀더)
function ProductImage({ src, query }) {
  const [failed, setFailed] = useState(false)
  const naverSrc = useNaverImage(src ? null : query)
  const resolvedSrc = src || naverSrc
  const showPlaceholder = !resolvedSrc || failed

  return (
    <div className="product-image-box">
      {!showPlaceholder && <img src={resolvedSrc} alt="" onError={() => setFailed(true)} />}
      {showPlaceholder && <span className="product-image-fallback">🖼️ 제품 이미지</span>}
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
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div className="card">
        {/* 뱃지 + 제품명을 플렉스박스로 한 줄에 나란히 배치 */}
        <div className="product-title-row">
          {/* _source가 있으면 fallback(일반식품·HACCP·수입식품)에서 온 건강보조식품
              — 리스트 카드(.result-badge)와 같은 외곽선 뱃지 스타일 */}
          <span className={`outline-badge ${product._source ? 'supplement' : 'certified'}`}>
            {product._source ? '건강보조식품' : '건강기능식품'}
          </span>
          <h2 style={{ margin: 0, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>{product.PRDLST_NM}</h2>
          {onToggleFavorite && (
            <FavoriteButton favorited={favorited} onToggle={onToggleFavorite} size="lg" />
          )}
        </div>
        <p className="result-biz" style={{ display: 'block', marginTop: '0.35rem' }}>{product.BSSH_NM}</p>

        {/* 식약처가 이 제품에 대해 직접 인정한 기능성 문구 — 핵심 정보라 별도 강조 박스로 구분 */}
        {product.PRIMARY_FNCLTY && (
          <div className="fnclty-callout">
            <p className="fnclty-label">✅ 식약처 인정 기능성</p>
            <p className="fnclty-text">{product.PRIMARY_FNCLTY}</p>
          </div>
        )}

        <ProductImage
          src={product.IMAGE_URL}
          query={`${product.PRDLST_NM ?? ''} ${product.BSSH_NM ?? ''}`.trim()}
        />

        <div className="section-divider" />

        <IngredientList
          rawmtrlNm={product.RAWMTRL_NM}
          primaryFnclty={product.PRIMARY_FNCLTY}
          modeWarnings={modeWarnings}
          myAllergies={myAllergies}
          interactions={interactions}
          onSelectIngredient={onSelectIngredient}
        />

        <div className="section-divider" />

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
