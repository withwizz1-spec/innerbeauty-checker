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

// 팝업 맨 위에 오는 결론 한 줄 — 칩만 보고는 "그래서 먹어도 되나"를 알 수 없어서,
// 등급·분류를 조합해 문장으로 먼저 답한다. 경고 사유(알레르기/해외 논란)를 우선 확인
function buildVerdict(ingredient) {
  if (ingredient.allergens.length > 0) {
    return {
      tone: 'warn',
      icon: '🚫',
      title: '알레르기 표시 대상 원료예요',
      description: `${ingredient.allergens.join(', ')} 알레르기가 있다면 피하세요.`,
    }
  }
  if (ingredient.controversial) {
    return {
      tone: 'warn',
      icon: '⚠️',
      title: '해외에서 논란이 있었던 성분이에요',
      description: '금지된 성분은 아니에요. 아래 내용을 보고 판단하세요.',
    }
  }
  if (ingredient.category === 'functional') {
    return {
      tone: 'functional',
      icon: '✅',
      title: '식약처가 기능성을 인정한 원료예요',
      description: '이 제품이 건강기능식품으로 인정받게 만든 핵심 성분이에요.',
    }
  }
  if (ingredient.category === 'additive') {
    return {
      tone: 'additive',
      icon: '🧪',
      title: '제품을 만들 때 쓰이는 첨가물이에요',
      description: '첨가물도 자체 안전성 심사를 거쳐 허용된 것만 쓸 수 있어요.',
    }
  }
  if (ingredient.category === 'base') {
    return {
      tone: 'base',
      icon: '🍽️',
      title: '평소 먹는 식품 원료예요',
      description: '기능성 원료도 첨가물도 아닌, 식품이 그대로 들어간 거예요.',
    }
  }
  return {
    tone: 'unknown',
    icon: '🔍',
    title: '처음 보는 원료예요',
    description: '안전하지 않다는 뜻이 아니라, 이 앱이 아직 못 알아본 거예요.',
  }
}

// '미확인'일 때만 보여주는 사실 목록 — 긴 문단 하나보다 세 줄로 나눠야 읽힘.
// CLAUDE.md의 "미확인 ≠ 미검증" 원칙을 화면 구조로 표현(심사는 거쳤다를 맨 위에)
function buildUnknownFacts(ingredient) {
  const facts = [
    {
      icon: '✅',
      lead: '식약처 심사는 이미 거쳤어요.',
      text: '이 원료가 든 제품이 건강기능식품으로 승인됐다는 건, 원료도 그 심사에서 검토됐다는 뜻이에요.',
    },
    {
      icon: '❓',
      lead: '다만 이 앱이 아직 못 알아봤어요.',
      text: '분류 사전에 이름이 없어서 어느 분류인지 자동으로 구분하지 못했어요.',
    },
  ]

  if (ingredient.allergens.length === 0 && !ingredient.controversial) {
    facts.push({
      icon: '🔍',
      lead: '알레르기·해외 논란 목록에는 없어요.',
      text: '식약처 표시 대상 21종과 해외 논란 6종 어디에도 해당하지 않아요.',
    })
  }
  return facts
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
function MisclassificationReport({ ingredientName, isUnknown = false }) {
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
        🚩 {isUnknown ? '이 원료를 알고 있다면 제보하기' : '이 분류가 틀렸다면 알려주기'}
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
          <option value="base">식품 원료</option>
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
  if (ingredient.category === 'base') {
    return '기능성 원료도 첨가물도 아닌, 우리가 평소 먹는 식품이 그대로 들어간 원료예요.'
  }
  if (ingredient.category === 'unknown') {
    return '이 앱의 분류 사전에 없어서 기능성원료인지 첨가물인지 자동으로 구분하지 못했어요. 이 원료가 들어있는 제품은 이미 건강기능식품으로 식약처 승인을 받았기 때문에, 원료 자체는 그 승인 심사에서 이미 검토된 상태예요 — "미확인"은 안전성 문제가 아니라 이 앱이 아직 못 알아본 것뿐이에요.'
  }
  return `이 제품에서의 구체적인 역할 설명은 제공되지 않았어요. 일반적으로 ${CATEGORY_LABEL[ingredient.category]}(으)로 쓰이는 성분이에요.`
}

// 성분 하나에 대한 상세 — 제품 상세 화면의 원재료 칩을 누르면 팝업으로 열림
// 구조: 결론 배너 → 분류·등급 칩 → 근거 섹션들 → 오분류 신고
function IngredientDetail({ ingredient, primaryFnclty, modeWarningReason }) {
  const role = extractIngredientRole(primaryFnclty, ingredient.name)
  const verdict = buildVerdict(ingredient)
  const isUnknown = ingredient.category === 'unknown'

  return (
    <div>
      <div className="ing-chips">
        <span className="tag-chip" style={CATEGORY_CHIP_STYLE[ingredient.category]}>
          #{CATEGORY_LABEL[ingredient.category]}
        </span>
        <Badge
          label={`${GRADE_ICON[ingredient.grade]} ${GRADE_LABEL[ingredient.grade]}`}
          style={GRADE_STYLE[ingredient.grade]}
        />
      </div>

      <h3 className="ing-name">{ingredient.name}</h3>
      {ingredient.detail && <p className="ing-detail">{ingredient.detail}</p>}

      <div className={`verdict-banner tone-${verdict.tone}`}>
        <span className="verdict-icon">{verdict.icon}</span>
        <div>
          <p className="verdict-title">{verdict.title}</p>
          <p className="verdict-desc">{verdict.description}</p>
        </div>
      </div>

      {/* 미확인은 이 앱의 핵심 화면이라, 배너에 이어 사실 목록을 붙여 한 덩어리로 보여줌 */}
      {isUnknown && (
        <ul className="unknown-facts">
          {buildUnknownFacts(ingredient).map((fact, i) => (
            <li key={i}>
              <span className="unknown-fact-icon">{fact.icon}</span>
              <span>
                <strong>{fact.lead}</strong> {fact.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 경고 사유를 역할보다 먼저 — 사용자가 팝업을 여는 이유가 대부분 이것 */}
      {ingredient.allergens.length > 0 && (
        <Section title="알레르기 유발물질">
          {ingredient.allergens.join(', ')} — 식약처가 표시 대상으로 지정한 21종 중 하나예요.
          <p className="ing-source">참고 기관: 식품의약품안전처</p>
        </Section>
      )}

      {ingredient.controversial && (
        <Section title="어떤 논란이었나">
          {ingredient.controversial.reason}
          <p className="ing-source">참고 기관: {ingredient.controversial.source}</p>
        </Section>
      )}

      {modeWarningReason && (
        <Section title="🔔 개인화 모드 주의">
          {modeWarningReason}
          <p className="ing-source">일반적인 참고 정보이며, 의료 상담을 대체하지 않아요.</p>
        </Section>
      )}

      {/* 미확인은 위 사실 목록이 역할 설명을 대신하므로 이 섹션을 생략 */}
      {!isUnknown && (
        <Section title={role ? '이 제품에서의 역할' : '이런 성분이에요'}>
          {role ?? roleFallbackText(ingredient)}
          {role && <p className="ing-source">근거: 이 제품의 식약처 인정 기능성 문구</p>}
        </Section>
      )}

      <MisclassificationReport ingredientName={ingredient.name} isUnknown={isUnknown} />
    </div>
  )
}

export default IngredientDetail
