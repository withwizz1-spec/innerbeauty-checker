import { findInteractions } from '../utils/findInteractions'

// 이 제품의 원재료 안에서 "함께 섭취 시 도움/주의"가 알려진 성분 조합을 찾아 보여주는 패널
// 사전(interactions)은 백엔드에서 앱 시작 시 한 번 받아오고, 매칭은 로컬(findInteractions)에서 수행
const TYPE_STYLE = {
  synergy: {
    icon: '🤝',
    label: '좋은 조합',
    border: '#b7e1c4',
    background: '#f0faf3',
    badge: { background: '#1a7f37', color: '#fff' },
  },
  caution: {
    icon: '⏳',
    label: '시간차 섭취 권장',
    border: '#ffd591',
    background: '#fff7e6',
    badge: { background: '#ad6800', color: '#fff' },
  },
}

function IngredientInteractions({ ingredients, interactions }) {
  const found = findInteractions(ingredients, interactions)
  if (found.length === 0) return null

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: '#333', margin: '0 0 0.3rem', textAlign: 'left' }}>
        성분 간 상호작용 ({found.length}건)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {found.map((item, i) => {
          const style = TYPE_STYLE[item.type]
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${style.border}`,
                background: style.background,
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    ...style.badge,
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                  }}
                >
                  {style.icon} {style.label}
                </span>
                <strong style={{ fontSize: '0.85rem', color: '#333' }}>
                  {item.a_name} + {item.b_name}
                </strong>
              </div>

              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#555' }}>{item.description}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999' }}>
                이 제품에서: {[...new Set([...item.aMatched, ...item.bMatched])].join(', ')} · 출처: {item.source}
              </p>
            </div>
          )
        })}
      </div>

      <p style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', color: '#aaa', textAlign: 'left' }}>
        * 일반적인 참고 정보이며, 의료 상담을 대체하지 않아요.
      </p>
    </div>
  )
}

export default IngredientInteractions
