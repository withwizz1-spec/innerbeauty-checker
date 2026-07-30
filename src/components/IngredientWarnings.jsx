// 알레르기 유발물질 / 국내외 논란 첨가물에 해당하는 성분을 유형별 줄(row)로 나눠 보여주는 요약 패널
// (화해 앱의 "20가지 주의성분 / Free" 줄 목록 스타일 참고 — 라벨+우측 개수, 0개면 회색 "없음")
// 상태색(빨강)은 이 기능에서만 쓰고, 분류 도넛·칩에는 쓰지 않음 (경고 신호를 여기에 집중시키기 위함)
function WarningRow({ icon, label, items, renderDetail }) {
  const count = items.length
  return (
    <div className="warning-row">
      <div className="warning-row-head">
        <span className="warning-row-icon">{icon}</span>
        <span className="warning-row-label">{label}</span>
        <span className={`warning-row-count${count === 0 ? ' warning-row-count--free' : ''}`}>
          {count > 0 ? `${count}개` : '없음'}
        </span>
      </div>

      {count > 0 && (
        <div className="warning-row-detail">
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
