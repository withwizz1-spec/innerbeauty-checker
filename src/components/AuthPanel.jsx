import { useState } from 'react'
import { signup, login } from '../api/authApi'
import { ALLERGENS } from '../data/allergens'

const HEALTH_MODE_LABEL = {
  none: '해당없음',
  pregnant: '임산부',
  elderly: '노인',
}

const HEALTH_MODE_DESC = '내 상황에 맞는 주의 성분을 자동으로 하이라이트해드려요.'

const ALLERGY_DESC = '체크한 알레르기 유발물질이 들어있는 성분을 원재료 목록에서 표시해드려요.'

// allergens.js의 라벨과 1:1로 매칭 — 목록에 없는 라벨은 ⚠️로 대체 표시
const ALLERGEN_ICON = {
  알류: '🥚',
  우유: '🥛',
  메밀: '🌾',
  땅콩: '🥜',
  대두: '🫘',
  밀: '🍞',
  잣: '🌰',
  호두: '🌰',
  게: '🦀',
  새우: '🦐',
  오징어: '🦑',
  고등어: '🐟',
  '조개류(굴·전복·홍합)': '🦪',
  복숭아: '🍑',
  토마토: '🍅',
  닭고기: '🍗',
  돼지고기: '🐷',
  쇠고기: '🐄',
  아황산류: '🧪',
}

// 로그인 안 된 상태 — 로그인/회원가입 폼
function LoginForm({ onAuthSuccess }) {
  const [formType, setFormType] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = formType === 'login' ? await login(email, password) : await signup(email, password)
      onAuthSuccess(token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="glass" style={{ marginBottom: '0.9rem' }}>
        <div className="segment">
          <button type="button" onClick={() => setFormType('login')} className={formType === 'login' ? 'active' : ''}>
            로그인
          </button>
          <button type="button" onClick={() => setFormType('signup')} className={formType === 'signup' ? 'active' : ''}>
            회원가입
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          required
          style={{ width: '100%' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (8자 이상)"
          required
          minLength={8}
          style={{ width: '100%' }}
        />
        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
          {formType === 'login' ? '로그인' : '가입하기'}
        </button>
      </form>
      {error && <p style={{ color: '#cf1322', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>{error}</p>}
    </div>
  )
}

function sameAllergies(a, b) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((label, i) => label === sortedB[i])
}

// 로그인 된 상태 — 계정 요약 카드 + 개인화 모드/알레르기 초안 편집 + 저장 버튼
function LoggedInPanel({ user, onSaveSettings, onLogout }) {
  const savedAllergies = user.allergies ?? []
  const [healthMode, setHealthMode] = useState(user.health_mode)
  const [allergies, setAllergies] = useState(savedAllergies)
  const [showAllergyGrid, setShowAllergyGrid] = useState(savedAllergies.length > 0)
  const [saving, setSaving] = useState(false)

  const isDirty = healthMode !== user.health_mode || !sameAllergies(allergies, savedAllergies)

  function handleAllergyPresenceChange(hasAllergy) {
    setShowAllergyGrid(hasAllergy)
    if (!hasAllergy) setAllergies([])
  }

  function toggleAllergen(label) {
    setAllergies((prev) => (prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSaveSettings({ health_mode: healthMode, allergies })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', marginBottom: '1rem' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <span className="avatar-circle">{user.email[0].toUpperCase()}</span>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-h)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.email}
        </span>
        <button onClick={onLogout} className="btn-plain" style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          로그아웃
        </button>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span className="capsule-dot" />개인화 모드
        </h3>
        <p style={{ margin: '0 0 0.9rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{HEALTH_MODE_DESC}</p>
        <div className="option-list">
          {Object.entries(HEALTH_MODE_LABEL).map(([value, label]) => {
            const selected = healthMode === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setHealthMode(value)}
                className={`option-card${selected ? ' selected' : ''}`}
                aria-pressed={selected}
              >
                {label}
                {selected && <span aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span className="capsule-dot" />알레르기
        </h3>
        <p style={{ margin: '0 0 0.9rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ALLERGY_DESC}</p>

        <div className="glass">
          <div className="segment">
            <button
              type="button"
              onClick={() => handleAllergyPresenceChange(false)}
              className={!showAllergyGrid ? 'active' : ''}
            >
              없음
            </button>
            <button
              type="button"
              onClick={() => handleAllergyPresenceChange(true)}
              className={showAllergyGrid ? 'active' : ''}
            >
              있음
            </button>
          </div>
        </div>

        {showAllergyGrid && (
          <div className="allergen-grid">
            {ALLERGENS.map(({ label }) => {
              const selected = allergies.includes(label)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleAllergen(label)}
                  className={`allergen-toggle${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                >
                  <span className="allergen-icon">{ALLERGEN_ICON[label] ?? '⚠️'}</span>
                  <span className="allergen-label">{label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!isDirty || saving}
        className="btn-primary"
        style={{ width: '100%' }}
      >
        {saving ? '저장 중...' : isDirty ? '저장' : '저장됨'}
      </button>
    </div>
  )
}

function AuthPanel({ user, onAuthSuccess, onSaveSettings, onLogout }) {
  return user ? (
    <LoggedInPanel user={user} onSaveSettings={onSaveSettings} onLogout={onLogout} />
  ) : (
    <LoginForm onAuthSuccess={onAuthSuccess} />
  )
}

export default AuthPanel
