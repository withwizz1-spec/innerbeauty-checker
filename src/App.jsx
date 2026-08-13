import { useState, useEffect } from 'react'
import { searchProducts, searchSupplementFallback } from './api/foodSafetyApi'
import { fetchIngredientCategories, fetchInteractions } from './api/ingredientApi'
import { fetchMe, updateSettings, fetchModeWarnings } from './api/authApi'
import { setCategoryDict } from './data/ingredientCategory'
import AppNav from './components/AppNav'
import Header from './components/Header'
import ResultsView from './components/ResultsView'
import RotatingHeadline from './components/RotatingHeadline'
import ProductDetail from './components/ProductDetail'
import IngredientDetail from './components/IngredientDetail'
import AuthPanel from './components/AuthPanel'
import CapsuleLayoutGreen from './components/CapsuleLayoutGreen'

function App() {
  // 화면 전환 상태머신 — 'home' | 'results' | 'detail' | 'ingredient' | 'auth'
  const [screen, setScreen] = useState('home')
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedIngredient, setSelectedIngredient] = useState(null)

  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [modeWarnings, setModeWarnings] = useState({})
  const [interactions, setInteractions] = useState([])

  // 앱 시작 시 성분 분류 사전·상호작용 사전을 백엔드에서 한 번만 받아와 캐싱
  useEffect(() => {
    fetchIngredientCategories().then(setCategoryDict).catch(() => {})
    fetchInteractions().then(setInteractions).catch(() => {})
  }, [])

  // 토큰이 있으면(새로고침 포함) 로그인 상태를 복원
  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
      })
  }, [token])

  // 개인화 모드가 바뀔 때마다 그 모드의 주의 성분 사전을 받아옴
  useEffect(() => {
    fetchModeWarnings(user?.health_mode ?? 'none').then(setModeWarnings).catch(() => setModeWarnings({}))
  }, [user?.health_mode])

  // 화면별 뒤로가기 대상 — ingredient→detail→results→home
  function goBack() {
    if (screen === 'ingredient') setScreen('detail')
    else if (screen === 'detail') setScreen('results')
    else setScreen('home')
  }

  function openProduct(product) {
    setSelectedProduct(product)
    setScreen('detail')
  }

  function openIngredient(ingredient) {
    setSelectedIngredient(ingredient)
    setScreen('ingredient')
  }

  function handleAuthSuccess(newToken) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  // 개인화 설정(모드+알레르기)을 '저장' 버튼 클릭 시 한 번에 반영
  async function handleSaveSettings({ health_mode, allergies }) {
    await updateSettings(token, { health_mode, allergies })
    setUser((prev) => ({ ...prev, health_mode, allergies }))
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!keyword.trim()) return

    setScreen('results')
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      let data = null
      let searchError = null
      try {
        data = await searchProducts(keyword)
      } catch (err) {
        searchError = err // C003이 죽어 있어도 fallback 소스는 시도
      }

      if (data?.products.length > 0) {
        setResults(data)
        return
      }

      // 건강기능식품에 없으면 일반식품(C002)·HACCP·수입식품 순으로 조회
      const fallback = await searchSupplementFallback(keyword)
      if (fallback.products.length > 0) {
        setResults({ ...fallback, fallbackUsed: true })
        return
      }

      // 건강기능식품 검색이 실패했고 fallback에서도 못 찾은 경우 —
      // 에러 종류에 따라 원인을 구분해서 안내 (백엔드 연결 실패 vs 식약처 서버 오류)
      if (searchError) {
        if (searchError.kind === 'network') {
          setError('앱 서버(백엔드)에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요.')
        } else if (searchError.kind === 'upstream') {
          setError('식약처 서버가 일시적으로 불안정해서 검색을 완료하지 못했어요. 잠시 후 다시 시도해주세요.')
        } else {
          setError('검색 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.')
        }
        return
      }
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 홈 화면은 캡슐 랜딩(자체 nav 포함)을 풀블리드로 렌더링, 그 외 화면은 기존 앱쉘(760px 고정폭 + 공용 Header) 유지
  if (screen === 'home') {
    return (
      <CapsuleLayoutGreen
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        user={user}
        onAuthClick={() => setScreen('auth')}
        onLogout={handleLogout}
      />
    )
  }

  // 화면 라벨 옆에 붙는 부가 정보 — 검색어는 재검색 바에 이미 보이므로 개수만
  const resultMeta =
    screen === 'results' && results?.products.length > 0
      ? `총 ${results.totalCount.toLocaleString()}개`
      : null

  return (
    <>
      <AppNav
        user={user}
        onAuthClick={() => setScreen('auth')}
        onLogout={handleLogout}
        onHome={() => setScreen('home')}
        onCta={(e) => {
          e.preventDefault()
          setScreen('home')
        }}
      />

      <div className="app-shell">
        {screen === 'results' && <RotatingHeadline />}

        {/* 결과 화면에서 홈으로 돌아가지 않고 바로 재검색 — 랜딩 히어로와 같은 검색창을 씀 */}
        {screen === 'results' && (
          <form className="cg-hero-search results-search cg-scope" onSubmit={handleSearch}>
            <div className="cg-hero-search-box">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="제품명을 입력하세요"
                aria-label="제품명 재검색"
              />
            </div>
            <button type="submit" className="cg-hero-search-btn">검색</button>
          </form>
        )}

        <Header screen={screen} user={user} onBack={goBack} meta={resultMeta} />

      {screen === 'results' && (
        <div style={{ marginTop: '0.5rem' }}>
          {loading && <p style={{ color: 'var(--text-muted)' }}>검색 중...</p>}
          {error && <p style={{ color: '#cf1322', fontSize: '0.9rem' }}>오류: {error}</p>}

          {results && (
            <>
              {results.products.length === 0 ? (
                <div className="banner-warn">
                  <strong>건강기능식품으로 등록되지 않은 제품이에요.</strong>
                  <p style={{ margin: '0.5rem 0 0', color: '#8a6116' }}>
                    식약처 정식 인증을 받은 "건강기능식품"이 아니라, 별도 인증 없이 판매되는
                    "건강보조식품"일 가능성이 높습니다.
                  </p>
                </div>
              ) : (
                <>
                  {/* fallback 안내 배너는 제거 — 제품마다 붙는 '건강보조식품' 뱃지로 이미 구분됨 */}
                  <ResultsView
                    products={results.products}
                    myAllergies={user?.allergies ?? []}
                    onSelect={openProduct}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}

      {screen === 'detail' && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          modeWarnings={modeWarnings}
          myAllergies={user?.allergies ?? []}
          interactions={interactions}
          onSelectIngredient={openIngredient}
        />
      )}

      {screen === 'ingredient' && selectedIngredient && (
        <IngredientDetail
          ingredient={selectedIngredient}
          primaryFnclty={selectedProduct?.PRIMARY_FNCLTY}
          modeWarningReason={modeWarnings[selectedIngredient.name]}
        />
      )}

      {screen === 'auth' && (
        <div style={{ marginTop: '0.5rem' }}>
          <AuthPanel
            user={user}
            onAuthSuccess={handleAuthSuccess}
            onSaveSettings={handleSaveSettings}
            onLogout={handleLogout}
          />
        </div>
      )}
      </div>
    </>
  )
}

export default App
