import { GRADE_LABEL, GRADE_ICON, GRADE_COLOR, GRADE_ORDER } from '../data/ingredientGrade'

// 성분 등급(경고/안전) 분포 — 칩 행(전체+등급별 개수) 아래 색상 바로 비율 표시
// (화해 앱 "성분 구성" 화면의 칩+바 조합을 참고해 우리 등급에 맞게 구성)
// 미확인은 "판정 불가"일 뿐 위험 신호가 아니라 분포에서는 제외(경고/주의성분 확인 목적과 무관) — IngredientWarnings에서 별도로 다룸
const VISIBLE_GRADES = GRADE_ORDER.filter((g) => g !== 'unknown')

function IngredientGradeBar({ ingredients }) {
  const total = ingredients.length
  if (total === 0) return null

  const counts = Object.fromEntries(
    VISIBLE_GRADES.map((g) => [g, ingredients.filter((i) => i.grade === g).length])
  )
  const segments = VISIBLE_GRADES.filter((g) => counts[g] > 0)

  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        성분 등급 분포
      </p>

      <div className="stat-chip-row">
        <span className="stat-chip stat-chip--total">
          전체 <strong>{total}개</strong>
        </span>
        {VISIBLE_GRADES.map((g) => (
          <span
            key={g}
            className="stat-chip"
            style={{ background: `${GRADE_COLOR[g]}1a`, color: GRADE_COLOR[g] }}
          >
            {GRADE_ICON[g]} {GRADE_LABEL[g]} <strong>{counts[g] > 0 ? `${counts[g]}개` : '0개'}</strong>
          </span>
        ))}
      </div>

      {/* 세그먼트 사이 2px 간격은 배경색이 그대로 보이는 flex gap으로 처리 */}
      <div style={{ display: 'flex', gap: '2px', height: '14px', marginTop: '0.6rem' }}>
        {segments.map((g, i) => {
          const left = i === 0 ? '999px' : '0'
          const right = i === segments.length - 1 ? '999px' : '0'
          return (
            <div
              key={g}
              title={`${GRADE_ICON[g]} ${GRADE_LABEL[g]} ${counts[g]}개 (${Math.round((counts[g] / total) * 100)}%)`}
              style={{
                flexGrow: counts[g],
                minWidth: '8px',
                background: GRADE_COLOR[g],
                // 양쪽 끝만 라운드 (top-left top-right bottom-right bottom-left)
                borderRadius: `${left} ${right} ${right} ${left}`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default IngredientGradeBar
