const SCREEN_TITLE = {
  results: '검색 결과',
  detail: '제품 상세',
  ingredient: '성분 상세',
}

// 상단 고정 헤더 — 홈에서는 로고+타이틀+로그인 칩, 그 외 화면에서는 ← 뒤로가기 + 화면 제목
function Header({ screen, user, onBack, onAuthClick }) {
  if (screen === 'home') {
    return (
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
          <span className="logo-pill">💊</span>
          <h1 style={{ fontSize: '1.05rem', margin: 0, letterSpacing: '-0.01em' }}>InnerBeauty Checker</h1>
        </div>
        <button className="auth-trigger" onClick={onAuthClick} style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {user ? `${user.email.split('@')[0]} ▾` : '로그인'}
        </button>
      </header>
    )
  }

  const title = screen === 'auth' ? (user ? '내 정보' : '로그인') : SCREEN_TITLE[screen]

  return (
    <header className="app-header">
      <button onClick={onBack} className="btn-ghost" aria-label="뒤로가기" style={{ fontSize: '1.1rem', padding: '0.3rem 0.6rem' }}>
        ←
      </button>
      <h2 style={{ fontSize: '1rem', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
    </header>
  )
}

export default Header
