import { useState } from 'react'
import { useNaverImage } from '../hooks/useNaverImage'

// 제품 썸네일 — IMAGE_URL(HACCP 공식 이미지)이 있으면 우선 표시.
// 없으면(대부분의 C003 결과) 네이버쇼핑 검색으로 보강한 이미지를 대신 씀.
function ProductThumb({ src, query, size = 56 }) {
  const [failed, setFailed] = useState(false)
  const naverSrc = useNaverImage(src ? null : query)
  const resolvedSrc = src || naverSrc
  const box = {
    width: size,
    height: size,
    borderRadius: '16px',
    flexShrink: 0,
    objectFit: 'cover',
    background: 'linear-gradient(135deg, #ffe29f, #ffa99f)',
  }

  if (!resolvedSrc || failed) {
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

  return <img src={resolvedSrc} alt="" style={box} onError={() => setFailed(true)} />
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
          <ProductThumb src={p.IMAGE_URL} query={`${p.PRDLST_NM ?? ''} ${p.BSSH_NM ?? ''}`.trim()} />
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
