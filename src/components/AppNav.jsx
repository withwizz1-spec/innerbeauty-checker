import { useEffect, useRef, useState } from 'react'

// 상단 nav — 홈 랜딩과 검색결과/상세/성분상세/로그인 화면이 공통으로 쓰는 컴포넌트
// (같은 마크업·CSS를 공유해야 화면 전환 시 nav가 미묘하게 달라 보이지 않음)
function AppNav({ user, onAuthClick, onHome, onCta, onLogout, onFavorites, favoriteCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // 바깥을 누르거나 Esc를 누르면 닫힘 — 드롭다운의 기본 동작
  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  function runAndClose(action) {
    setMenuOpen(false)
    action?.()
  }

  return (
    <nav className="cg-nav cg-scope">
      <div className="cg-nav-inner">
        <button type="button" className="cg-nav-logo" onClick={onHome}>
          <span className="cg-capsule" />
          InnerBeauty Checker
        </button>
        <div className="cg-nav-actions">
          {user ? (
            <div className="nav-menu" ref={menuRef}>
              <button
                type="button"
                className="cg-nav-auth"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {user.email.split('@')[0]} <span className="nav-caret">▾</span>
              </button>

              {menuOpen && (
                <div className="nav-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={() => runAndClose(onFavorites)}>
                    내 영양제 리스트
                    {favoriteCount > 0 && <em className="nav-count">{favoriteCount}</em>}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runAndClose(onAuthClick)}>
                    마이페이지
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="nav-dropdown-danger"
                    onClick={() => runAndClose(onLogout)}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="cg-nav-auth" onClick={onAuthClick}>
              로그인
            </button>
          )}

          <a href="#cg-search" className="cg-nav-cta" onClick={onCta}>
            내 영양제 확인하기
          </a>
        </div>
      </div>
    </nav>
  )
}

export default AppNav
