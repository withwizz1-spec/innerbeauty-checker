const SCREEN_TITLE = {
  results: '검색 결과',
  detail: '제품 상세',
  ingredient: '성분 상세',
}

// 화면 라벨 줄 — ← 뒤로가기 + 현재 화면 이름(+ 부가 정보)
// 랜딩의 섹션 아이브로우(.cg-section-eyebrow)와 같은 mono·자간을 써서 톤을 맞춤
function Header({ screen, user, onBack, meta }) {
  const title = screen === 'auth' ? (user ? '내 정보' : '로그인') : SCREEN_TITLE[screen]

  return (
    <div className="page-head">
      <button onClick={onBack} className="page-back" aria-label="이전 화면으로">
        ←
      </button>
      <span className="page-label">
        {title}
        {meta && (
          <>
            <span className="page-label-sep"> · </span>
            <strong className="page-label-count">{meta}</strong>
          </>
        )}
      </span>
    </div>
  )
}

export default Header
