import { useState } from 'react'

// 알레르기 유발물질 / 국내외 논란 첨가물에 해당하는 성분을 유형별 줄(row)로 나눠 보여주는 요약 패널
// (화해 앱의 "20가지 주의성분" 줄 목록 스타일 참고 — 클릭하면 출처 안내 + 해당 성분명이 펼쳐짐)
// 상태색(빨강)은 이 기능에서만 쓰고, 분류 도넛·칩에는 쓰지 않음 (경고 신호를 여기에 집중시키기 위함)
function WarningRow({ icon, label, items, source, renderDetail }) {
  const [open, setOpen] = useState(false)
  const count = items.length

  return (
    <div className="warning-row">
      <button
        type="button"
        className="warning-row-head"
        onClick={() => count > 0 && setOpen((v) => !v)}
        disabled={count === 0}
      >
        <span className="warning-row-icon">{icon}</span>
        <span className="warning-row-label">{label}</span>
        <span className={`warning-row-count${count === 0 ? ' warning-row-count--free' : ''}`}>
          {count > 0 ? `${count}개` : '없음'}
        </span>
        {count > 0 && <span className={`warning-row-caret${open ? ' warning-row-caret--open' : ''}`}>▾</span>}
      </button>

      {open && count > 0 && (
        <div className="warning-row-detail">
          <p className="warning-row-source">{source}</p>
          {items.map((ing, i) => (
            <p key={i}>{renderDetail(ing)}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function IngredientWarnings({ ingredients }) {
  const flagged = ingredients.filter((i) => i.grade === 'warning')
  if (flagged.length === 0) return null

  const allergenItems = flagged.filter((i) => i.allergens.length > 0)
  const controversialItems = flagged.filter((i) => i.controversial)

  return (
    <div className="warning-panel">
      <strong className="warning-panel-title">⚠️ 확인이 필요한 성분 {flagged.length}개</strong>

      <div className="warning-row-list">
        <WarningRow
          icon="🚫"
          label="알레르기 유발물질 성분"
          items={allergenItems}
          source="식약처(식품안전나라)가 지정한 알레르기 유발물질 표시 대상 목록 기준이에요"
          renderDetail={(ing) => (
            <>
              <strong>{ing.name}</strong> · {ing.allergens.join(', ')}
            </>
          )}
        />
        <WarningRow
          icon="🌐"
          label="해외 논란 참고 성분"
          items={controversialItems}
          source="해외에서 안전성 논란이 있었던 성분이에요. 국내에서는 대부분 허용 기준 내 사용이 가능해요"
          renderDetail={(ing) => (
            <>
              <strong>{ing.name}</strong> — {ing.controversial.reason}{' '}
              <span style={{ color: 'var(--text-muted)' }}>({ing.controversial.source})</span>
            </>
          )}
        />
      </div>
    </div>
  )
}

export default IngredientWarnings
