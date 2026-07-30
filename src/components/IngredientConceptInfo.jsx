import { useState } from 'react'

// 기능성원료 / 첨가물 / 미확인의 의미를 설명하는 개념 안내
// 성분 하나하나에 대한 설명이 아니라, 이 분류 체계 자체에 대한 일반적인 설명
// 섹션 타이틀(title)과 같은 줄에 우측 정렬로 배치됨
function IngredientConceptInfo({ title }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div className="ingredient-section-head">
        <h3 className="section-title" style={{ margin: 0 }}>
          {title}
        </h3>
        <button
          type="button"
          className="btn-plain"
          onClick={() => setOpen((v) => !v)}
          style={{ color: '#1c5cab', fontSize: '0.78rem', textDecoration: 'underline', flexShrink: 0 }}
        >
          ⓘ 기능성원료·첨가물·미확인이 뭔가요?
        </button>
      </div>

      {open && (
        <div
          style={{
            marginTop: '0.5rem',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: '8px',
            padding: '0.9rem 1rem',
            fontSize: '0.85rem',
            color: '#555',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
          }}
        >
          <div>
            <strong style={{ color: '#1c5cab' }}>기능성원료</strong> — 이 제품이 "건강기능식품"으로
            인정받게 만든 핵심 성분이에요. 식약처가 특정 건강 기능(예: 면역기능, 항산화 등)에 대해
            효과와 안전성을 직접 심사해서 인정한 성분입니다.
          </div>
          <div>
            <strong style={{ color: '#128a5e' }}>첨가물</strong> — 정제·캡슐 형태를 만들거나, 맛을
            내거나, 보존하기 위한 보조 성분이에요. 기능성원료와는 심사 방식이 달라서 "식품첨가물공전"
            기준(1일섭취허용량 등)으로 별도 안전성 심사를 거칩니다.{' '}
            <strong>기능성원료보다 덜 안전하다는 뜻이 아니라, 역할이 다를 뿐이에요.</strong>
          </div>
          <div>
            <strong style={{ color: '#666' }}>미확인</strong> — 이 앱이 가진 작은 분류 사전에 이름이
            없어서, 기능성원료인지 첨가물인지 자동으로 구분하지 못한 성분이에요. 이 원료가 포함된
            제품은 이미 건강기능식품으로 식약처 승인을 받았기 때문에, 원료 자체는 그 승인 과정에서
            이미 검토된 상태예요 — <strong>검증이 안 됐거나 안전성이 불확실하다는 뜻이 아니에요.</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default IngredientConceptInfo
