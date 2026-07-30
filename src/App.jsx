import { useState, useEffect } from 'react'
import { searchProducts, searchSupplementFallback } from './api/foodSafetyApi'
import { fetchIngredientCategories, fetchInteractions } from './api/ingredientApi'
import { fetchMe, updateSettings, fetchModeWarnings } from './api/authApi'
import { setCategoryDict } from './data/ingredientCategory'
import Header from './components/Header'
import ProductList from './components/ProductList'
import ProductDetail from './components/ProductDetail'
import IngredientDetail from './components/IngredientDetail'
import ImageScanUpload from './components/ImageScanUpload'
import AuthPanel from './components/AuthPanel'

// 홈 화면 하단 안내 카드 — "이런 걸 확인할 수 있어요"
const HOME_INFO_CARDS = [
  { icon: '💊', text: '건강기능식품 vs 건강보조식품 구분 — 식약처 정식 인증 여부를 뱃지로 바로 확인' },
  { icon: '✅', text: '원재료 하나하나의 등급(경고·안전·미확인)과 역할' },
  { icon: '🔔', text: '임산부·노인 등 내 상황에 맞춘 주의 성분 하이라이트' },
]

function App() {
  // 화면 전환 상태머신 — 'home' | 'results' | 'detail' | 'ingredient' | 'auth'
  const [screen, setScreen] = useState('home')
  const [homeTab, setHomeTab] = useState('search') // 'search' | 'scan'
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

  return (
    <div>
      <Header screen={screen} user={user} onBack={goBack} onAuthClick={() => setScreen('auth')} />

      {screen === 'home' && (
        <>
          <p style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem', lineHeight: 1.4 }}>
            오늘 먹은 성분, 안심하고 넘어가자
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: '1.25rem' }}>
            성분을 알고 먹는 건강한 습관
          </p>

          <div className="glass">
            <div className="segment">
              <button onClick={() => setHomeTab('search')} className={homeTab === 'search' ? 'active' : ''}>
                제품명 검색
              </button>
              <button onClick={() => setHomeTab('scan')} className={homeTab === 'scan' ? 'active' : ''}>
                성분표 스캔
              </button>
            </div>
          </div>

          {homeTab === 'scan' ? (
            <div style={{ marginTop: '1rem' }}>
              <ImageScanUpload />
            </div>
          ) : (
            <>
              {/* 검색창 — 고정폭 대신 flex:1로 화면 폭에 맞춰 늘어남 (반응형) */}
              <form onSubmit={handleSearch} className="search-bar" style={{ marginTop: '1rem' }}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="제품명 입력 (예: 비타민C)"
                />
                <button type="submit" className="btn-primary">
                  검색
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 0.2rem' }}>
                  이런 걸 확인할 수 있어요
                </p>
                {HOME_INFO_CARDS.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      alignItems: 'flex-start',
                      padding: '0.75rem 0.9rem',
                      background: 'var(--brand-soft)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5 }}>{c.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

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
                  {results.fallbackUsed && (
                    <div className="banner-warn" style={{ marginBottom: '1rem' }}>
                      건강기능식품 목록에는 없어서, 일반식품·수입식품 신고 정보에서 찾았어요.
                      식약처 기능성 인증을 받지 않은 <strong>건강보조식품</strong>일 가능성이 높아요.
                    </div>
                  )}
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    '{keyword}' 검색 결과 {results.totalCount.toLocaleString()}개
                  </p>
                  <ProductList products={results.products} onSelect={openProduct} />
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
  )
}

export default App
