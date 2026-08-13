import { useState } from 'react'
import { CATEGORY_LABEL, CATEGORY_COLOR } from '../data/ingredientCategory'
import { GRADE_LABEL, GRADE_ICON, GRADE_COLOR } from '../data/ingredientGrade'
import { extractIngredientRole } from '../utils/extractIngredientRole'
import { reportMisclassification } from '../api/ingredientApi'

// 분류 칩 색 — 실제 브랜드 팔레트(CATEGORY_COLOR)에서 파생. 리스트/제품상세 칩과 항상 같은 색을 쓰도록
// 하드코딩 색상표를 따로 두지 않음 (예전엔 여기만 파란색으로 따로 박혀있어서 화면마다 색이 달랐음)
const CATEGORY_CHIP_STYLE = Object.fromEntries(
  Object.entries(CATEGORY_COLOR).map(([cat, color]) => [cat, { background: `${color}1a`, color }])
)

const GRADE_STYLE = {
  warning: { background: GRADE_COLOR.warning, color: '#fff' },
  safe: { background: GRADE_COLOR.safe, color: '#fff' },
  unknown: { background: GRADE_COLOR.unknown, color: '#fff' },
}

function Badge({ label, style }) {
  return (
    <span
      style={{
        ...style,
        fontSize: '0.75rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
      }}
    >
      {label}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h4
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--brand-strong)',
          fontWeight: 600,
          margin: '0 0 0.35rem',
        }}
      >
        <span className="capsule-dot" />
        {title}
      </h4>
      <div style={{ fontSize: '0.85rem', color: '#555' }}>{children}</div>
    </div>
  )
}

// 이 성분의 분류(기능성원료/첨가물/미확인)가 잘못됐다고 생각될 때 신고하는 작은 폼
function MisclassificationReport({ ingredientName }) {
  const [open, setOpen] = useState(false)
  const [suggestedCategory, setSuggestedCategory] = useState('functional')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    await reportMisclassification({ name: ingredientName, suggestedCategory, reason })
    setSubmitted(true)
  }

  if (submitted) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--brand-strong)', marginTop: '1rem' }}>신고 접수됐어요. 감사합니다!</p>
  }

  if (!open) {
    return (
      <button
        className="btn-plain"
        onClick={() => setOpen(true)}
        style={{ marginTop: '1rem', color: '#999', fontSize: '0.8rem', textDecoration: 'underline' }}
      >
        🚩 이 분류가 틀렸다면 신고하기
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: '1rem',
        padding: '0.8rem',
        border: '1px solid #eee',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <label style={{ fontSize: '0.8rem' }}>
        올바른 분류:{' '}
        <select value={suggestedCategory} onChange={(e) => setSuggestedCategory(e.target.value)}>
          <option value="functional">기능성원료</option>
          <option value="additive">첨가물</option>
        </select>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="신고 사유 (선택)"
        rows={2}
        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
      />
      <button type="submit" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
        신고 제출
      </button>
    </form>
  )
}

function roleFallbackText(ingredient) {
  if (ingredient.category === 'unknown') {
    return '이 앱의 분류 사전에 없어서 기능성원료인지 첨가물인지 자동으로 구분하지 못했어요. 이 원료가 들어있는 제품은 이미 건강기능식품으로 식약처 승인을 받았기 때문에, 원료 자체는 그 승인 심사에서 이미 검토된 상태예요 — "미확인"은 안전성 문제가 아니라 이 앱이 아직 못 알아본 것뿐이에요.'
  }
  return `이 제품에서의 구체적인 역할 설명은 제공되지 않았어요. 일반적으로 ${CATEGORY_LABEL[ingredient.category]}(으)로 쓰이는 성분이에요.`
}

// 성분 하나에 대한 상세 화면 — 역할(기능성 텍스트에서 추출) · 등급 · 참고 기관
function IngredientDetail({ ingredient, primaryFnclty, modeWarningReason }) {
  const role = extractIngredientRole(primaryFnclty, ingredient.name)

  return (
    <div style={{ marginTop: '1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="capsule-dot" />
          <h3 style={{ margin: 0 }}>{ingredient.name}</h3>
        </div>
        {ingredient.detail && (
          <p style={{ margin: '0.25rem 0 0.5rem 1.4rem', color: '#999', fontSize: '0.85rem' }}>{ingredient.detail}</p>
        )}

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
          <span className="tag-chip" style={CATEGORY_CHIP_STYLE[ingredient.category]}>
            #{CATEGORY_LABEL[ingredient.category]}
          </span>
          <Badge
            label={`${GRADE_ICON[ingredient.grade]} ${GRADE_LABEL[ingredient.grade]}`}
            style={GRADE_STYLE[ingredient.grade]}
          />
        </div>

        <Section title="역할">{role ?? roleFallbackText(ingredient)}</Section>

        {ingredient.allergens.length > 0 && (
          <Section title="알레르기 유발물질">
            {ingredient.allergens.join(', ')} — 식약처가 표시 대상으로 지정한 알레르기 유발물질입니다.
            <p style={{ margin: '0.3rem 0 0', color: '#999' }}>참고 기관: 식품의약품안전처</p>
          </Section>
        )}

        {ingredient.controversial && (
          <Section title="참고할 안전성 이슈 (해외 논란 참고용)">
            {ingredient.controversial.reason}
            <p style={{ margin: '0.3rem 0 0', color: '#999' }}>참고 기관: {ingredient.controversial.source}</p>
          </Section>
        )}

        {modeWarningReason && (
          <Section title="🔔 개인화 모드 주의">
            {modeWarningReason}
            <p style={{ margin: '0.3rem 0 0', color: '#999' }}>
              일반적인 참고 정보이며, 의료 상담을 대체하지 않아요.
            </p>
          </Section>
        )}

        <MisclassificationReport ingredientName={ingredient.name} />
      </div>
    </div>
  )
}

export default IngredientDetail
