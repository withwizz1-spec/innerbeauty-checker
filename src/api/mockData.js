// 식약처 서버 점검/장애 시 UI를 미리보기 위한 가데이터.
// VITE_MOCK_DATA=true일 때만 foodSafetyApi.js에서 사용됨 (.env.local, git에 커밋 안 됨)
export const MOCK_PRODUCTS = [
  {
    // 건강기능식품(C003) — 기능성원료/첨가물/미확인, 알레르기, 해외 논란 첨가물까지 한 번에 확인 가능
    PRDLST_NM: '비타민C 1000 이지츄어블정',
    BSSH_NM: '안국건강',
    PRIMARY_FNCLTY: '[비타민C] 결합조직 형성과 기능 유지, 항산화 작용, 철의 흡수에 도움을 줄 수 있음',
    RAWMTRL_NM:
      '비타민C(L-Ascorbic acid), 결정셀룰로오스, 스테아린산마그네슘, 이산화규소, 대두레시틴(유화제), 히드록시프로필메틸셀룰로오스(코팅제), 카르나우바왁스(광택제), 바닐라향, 아스파탐',
    PRDKIND: '정제형',
    ALLERGY_INFO: '대두 함유',
    NTK_MTHD: '1일 1회 1정씩 씹어서 섭취',
    IFTKN_ATNT_MATR_CN: '특이체질, 알레르기 체질인 경우 성분을 확인하고 섭취하세요.',
    CSTDY_MTHD: '직사광선을 피해 서늘하고 건조한 곳에 보관',
    POG_DAYCNT: '제조일로부터 24개월',
    PRDLST_REPORT_NO: 'MOCK-20260001',
  },
  {
    // 건강보조식품(fallback 경로) — 원재료명 없이도 화면이 자연스럽게 보이는지 확인용
    _source: 'general',
    PRDLST_NM: '이너랑 저분자 콜라겐 스틱',
    BSSH_NM: '코스맥스바이오',
    RAWMTRL_NM: '정제수, 저분자콜라겐펩타이드(돼지껍질 유래), 우유',
    PRDKIND: '액상차',
    ALLERGY_INFO: '우유 함유',
    NUTRIENT_INFO: '1포(10g)당 열량 20kcal, 단백질 9g',
    PRDLST_REPORT_NO: 'mock-fallback-0',
  },
]

// 검색어와 제품명을 느슨하게 비교 (공백 제거 + 부분 포함)
export function matchMockProduct(keyword, product) {
  const clean = (s) => s.replace(/\s/g, '').toLowerCase()
  return clean(product.PRDLST_NM).includes(clean(keyword))
}
