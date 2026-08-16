// 제품을 식별하는 키 — 백엔드 favorites.py의 build_product_key와 같은 규칙이어야 함
// (수입식품처럼 신고번호가 없는 소스가 있어서 제품명+업소명으로 보강)
export function buildProductKey(product) {
  const reportNo = (product?.PRDLST_REPORT_NO ?? '').trim()
  if (reportNo) return reportNo

  const name = (product?.PRDLST_NM ?? '').trim()
  const bssh = (product?.BSSH_NM ?? '').trim()
  return name ? `${name}|${bssh}` : ''
}
