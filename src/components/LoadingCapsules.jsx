import './LoadingCapsules.css'

// 검색이 5~18초까지 걸릴 수 있어서(2026-08-13 실측) "검색 중..." 한 줄 대신 도입.
// 궤도를 도는 캡슐 3개 색은 장식이 아니라 실제 성분 분류 색
// (ingredientCategory.js의 CATEGORY_COLOR: functional/additive/base)과 맞춘 것 —
// "지금 원재료를 종류별로 나누는 중"이라는 뜻을 담았음
const STATUS_MESSAGES = [
  '식약처 데이터베이스 조회 중',
  '원재료 원문 파싱하는 중',
  '기능성원료·첨가물·식품 원료로 나누는 중',
]

function LoadingCapsules() {
  return (
    <div className="loading-capsules" role="status" aria-label="검색 결과를 불러오는 중입니다">
      <div className="lc-stage" aria-hidden="true">
        <div className="lc-track lc-track-1" />
        <div className="lc-track lc-track-2" />
        <div className="lc-track lc-track-3" />

        <div className="lc-lens">🔍</div>

        <div className="lc-orbit lc-orbit-1"><div className="lc-cap lc-cap-functional" /></div>
        <div className="lc-orbit lc-orbit-2"><div className="lc-cap lc-cap-additive" /></div>
        <div className="lc-orbit lc-orbit-3"><div className="lc-cap lc-cap-base" /></div>
      </div>

      <div className="lc-status" aria-hidden="true">
        {STATUS_MESSAGES.map((msg) => (
          <span key={msg}>{msg}</span>
        ))}
      </div>
    </div>
  )
}

export default LoadingCapsules
