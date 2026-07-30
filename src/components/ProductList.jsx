import { useState } from 'react'

// 제품 썸네일 — 이미지 URL이 있으면 표시하고, 로드 실패 시 플레이스홀더로 대체.
// 현재 이미지를 제공하는 소스는 HACCP(IMAGE_URL)뿐이라 대부분은 플레이스홀더가 뜸.
function ProductThumb({ src, size = 56 }) {
  const [failed, setFailed] = useState(false)
  const box = {
    width: size,
    height: size,
    borderRadius: '16px',
    flexShrink: 0,
    objectFit: 'cover',
    background: 'linear-gradient(135deg, #ffe29f, #ffa99f)',
  }

  if (!src || failed) {
    return (
      <div
        style={{
          ...box,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
        }}
      >
        💊
      </div>
    )
  }

  return <img src={src} alt="" style={box} onError={() => setFailed(true)} />
}

function ProductList({ products, onSelect }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0' }}>
      {products.map((p) => (
        <li
          key={p.PRDLST_REPORT_NO}
          onClick={() => onSelect(p)}
          className="card"
          style={{
            display: 'flex',
            gap: '0.85rem',
            alignItems: 'center',
            marginBottom: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <ProductThumb src={p.IMAGE_URL} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ color: 'var(--text-h)' }}>{p.PRDLST_NM}</strong>
            {p._source && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  background: '#fff7e6',
                  color: '#ad6800',
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}
              >
                건강보조식품
              </span>
            )}
            <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.BSSH_NM}</p>
            {/* 기능성 문구는 2줄까지만 보여주고 말줄임 — 카드 높이 들쭉날쭉 방지 */}
            <p
              style={{
                margin: '0.4rem 0 0',
                fontSize: '0.85rem',
                color: 'var(--text)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {p.PRIMARY_FNCLTY}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ProductList
