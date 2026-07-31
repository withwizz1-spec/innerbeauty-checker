import { useEffect, useState } from 'react'
import { getProductImage } from '../api/foodSafetyApi'

// 세션 내 중복 조회 방지용 — 같은 제품이 목록/상세에 동시에 뜰 수 있음
const cache = new Map()

// query가 없으면(=이미 IMAGE_URL이 있어서 보강이 필요 없으면) 아무것도 하지 않음
export function useNaverImage(query) {
  const [imageUrl, setImageUrl] = useState(() => (query ? (cache.get(query) ?? null) : null))

  useEffect(() => {
    if (!query || cache.has(query)) return
    let cancelled = false

    getProductImage(query)
      .then((url) => {
        cache.set(query, url)
        if (!cancelled) setImageUrl(url)
      })
      .catch(() => {
        cache.set(query, null)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return imageUrl
}
