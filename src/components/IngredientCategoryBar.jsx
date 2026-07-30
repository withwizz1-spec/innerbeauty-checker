import { CATEGORY_LABEL, CATEGORY_COLOR, CATEGORY_ORDER } from '../data/ingredientCategory'

// 성분 분류(기능성원료/첨가물/미확인) 구성비 — IngredientGradeBar와 같은 칩+바 스타일로 통일
// (기존 도넛 차트를 대체: 도넛은 브랜드와 무관한 색 + 작은 구간에서 strokeLinecap round가
// 뭉툭하게 보이는 문제가 있었음). 등급 칩과 헷갈리지 않게 아이콘 없이 색 점(dot)만 사용
// — 라벨 텍스트가 항상 같이 있어 색만으로 구분하지는 않음
function IngredientCategoryBar({ counts, total }) {
  if (total === 0) return null

  const segments = CATEGORY_ORDER.filter((c) => counts[c] > 0)

  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        성분 분류 구성 · 무게가 아닌 가짓수 기준
      </p>

      <div className="stat-chip-row">
        {CATEGORY_ORDER.map((c) => (
          <span key={c} className="stat-chip" style={{ background: `${CATEGORY_COLOR[c]}1a`, color: CATEGORY_COLOR[c] }}>
            <span className="stat-chip-dot" style={{ background: CATEGORY_COLOR[c] }} />
            {CATEGORY_LABEL[c]} <strong>{counts[c] > 0 ? `${counts[c]}개` : '0개'}</strong>
          </span>
        ))}
      </div>

      {/* 세그먼트 사이 2px 간격은 배경색이 그대로 보이는 flex gap으로 처리 */}
      <div style={{ display: 'flex', gap: '2px', height: '14px', marginTop: '0.6rem' }}>
        {segments.map((c, i) => {
          const left = i === 0 ? '999px' : '0'
          const right = i === segments.length - 1 ? '999px' : '0'
          return (
            <div
              key={c}
              title={`${CATEGORY_LABEL[c]} ${counts[c]}개 (${Math.round((counts[c] / total) * 100)}%)`}
              style={{
                flexGrow: counts[c],
                minWidth: '8px',
                background: CATEGORY_COLOR[c],
                borderRadius: `${left} ${right} ${right} ${left}`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default IngredientCategoryBar
