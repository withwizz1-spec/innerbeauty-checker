import IngredientGradeBar from './IngredientGradeBar'

// 제품 성분을 숫자 세 개로 요약 — 스크롤하지 않고도 "몇 개 중 몇 개가 문제인지" 바로 읽히게.
// '낯선 원료'를 한 칸으로 둔 건, 이 앱이 봐주는 게 유명 성분이 아니라 처음 보는 원료이기 때문
function ProductSummary({ ingredients }) {
  if (ingredients.length === 0) return null

  const warningCount = ingredients.filter((i) => i.grade === 'warning').length
  const unknownCount = ingredients.filter((i) => i.category === 'unknown').length

  return (
    <div className="card">
      <h3 className="section-title">
        <span className="capsule-dot" />
        한눈에 보기
      </h3>

      <div className="summary-stats">
        <div className="summary-stat">
          <span className="summary-num">{ingredients.length}</span>
          <span className="summary-label">전체 성분</span>
        </div>
        <div className="summary-stat warn">
          <span className="summary-num">{warningCount}</span>
          <span className="summary-label">확인 필요</span>
        </div>
        <div className="summary-stat unknown">
          <span className="summary-num">{unknownCount}</span>
          <span className="summary-label">낯선 원료</span>
        </div>
      </div>

      <IngredientGradeBar ingredients={ingredients} />
    </div>
  )
}

export default ProductSummary
