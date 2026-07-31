// 우리 백엔드(FastAPI)를 통해 식품안전나라 API를 조회
// 백엔드가 인증키 보관 + CORS 처리를 대신 해줌 (프론트엔드에는 키가 없음)

import { isLikelySupplement, isDeclaredHealthImport } from '../utils/filterFallbackNoise';
import { MOCK_PRODUCTS, matchMockProduct } from './mockData';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
// 식약처 서버 점검/장애 시 UI 미리보기용 — .env.local에서만 켜고, 커밋되지 않음
const USE_MOCK_DATA = import.meta.env.VITE_MOCK_DATA === 'true';

async function fetchJson(path, params) {
  let res;
  try {
    res = await fetch(`${BACKEND_URL}${path}?${new URLSearchParams(params)}`);
  } catch {
    // fetch 자체가 실패 = 백엔드에 연결 못 함(서버 꺼짐/네트워크). 식약처 문제와 구분
    const err = new Error('백엔드에 연결할 수 없습니다');
    err.kind = 'network';
    throw err;
  }
  if (!res.ok) {
    // 백엔드는 식약처/공공데이터 오류를 502(호출 실패)나 504(응답 지연 타임아웃)로 전달함 → 그 외 상태코드와 구분
    const err = new Error(`HTTP 오류: ${res.status}`);
    err.kind = res.status === 502 || res.status === 504 ? 'upstream' : 'http';
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// 제품명으로 건강기능식품 목록 검색
export async function searchProducts(keyword, startIdx = 1, endIdx = 10) {
  if (USE_MOCK_DATA) {
    const products = MOCK_PRODUCTS.filter((p) => !p._source && matchMockProduct(keyword, p));
    return { totalCount: products.length, products };
  }
  return fetchJson('/api/search', { keyword, start_idx: startIdx, end_idx: endIdx });
}

// 제품 상세 정보 조회 (신고번호 기준)
export async function getProductDetail(reportNo) {
  return fetchJson('/api/detail', { report_no: reportNo });
}

// 이미지가 없는 제품(주로 C003)을 네이버쇼핑 검색으로 보강. 실패해도 백엔드가 항상
// { image_url: null }로 응답하므로 여기서는 별도 에러 처리를 하지 않음
export async function getProductImage(query) {
  const data = await fetchJson('/api/product-image', { query });
  return data.image_url;
}

// --- 건강보조식품 fallback 검색 ---
// C003(건강기능식품)에서 못 찾은 제품을 다른 공공 데이터에서 찾고,
// 결과를 C003 필드 형태(PRDLST_NM 등)로 정규화해 기존 화면 컴포넌트를 그대로 재사용

// C002(일반 가공식품)는 C003과 같은 식품안전나라 스키마라 필드명이 이미 동일.
// C002·HACCP는 "모든 가공식품 DB"라 반찬·과자 등이 섞여 들어옴 — 식품유형(PRDKIND/PRDLST_DCNM)과
// 제품명 패턴으로 걸러냄(isLikelySupplement). totalCount도 필터링된 개수로 맞춤
async function searchGeneral(keyword) {
  const data = await fetchJson('/api/search/general', { keyword });
  const products = data.products
    .map((p) => ({ ...p, _source: 'general', PRDKIND: p.PRDLST_DCNM }))
    .filter(isLikelySupplement);
  return { totalCount: products.length, products };
}

async function searchHaccp(keyword) {
  const data = await fetchJson('/api/search/haccp', { keyword });
  const products = data.products
    .map((p) => ({
      _source: 'haccp',
      PRDLST_NM: p.prdlstNm,
      BSSH_NM: (p.manufacture ?? '').split('_')[0].trim(), // "업체명_주소" 결합 형태
      RAWMTRL_NM: p.rawmtrl,
      PRDLST_REPORT_NO: p.prdlstReportNo,
      ALLERGY_INFO: p.allergy,
      NUTRIENT_INFO: p.nutrient,
      // 배포(https) 환경에서 http 이미지가 mixed-content로 차단되지 않도록 https로 승격
      IMAGE_URL: p.imgurl1?.replace(/^http:/, 'https:'),
      PRDKIND: p.prdkind,
    }))
    .filter(isLikelySupplement);
  return { totalCount: products.length, products };
}

// 수입식품은 DCL_PRDUCT_SE_CD_NM(신고구분) 필드로 "건강기능식품" 신고 여부를 직접 확인할 수 있어서
// 식품유형 추측보다 훨씬 정밀한 필터가 가능함 — 매핑 전(원본 필드 기준)에 먼저 거름
async function searchImported(keyword) {
  const data = await fetchJson('/api/search/imported', { keyword });
  const products = data.products.filter(isDeclaredHealthImport).map((p, i) => ({
    _source: 'imported',
    PRDLST_NM: p.PRDUCT_KOREAN_NM,
    BSSH_NM: p.BSN_OFC_NAME,
    RAWMTRL_NM: p.IRDNT_NM,
    PRDLST_REPORT_NO: `imported-${i}`, // 수입신고 데이터에는 품목보고번호가 없어 리스트 key용으로만 생성
    MANUF_COUNTRY: p.MNF_NTNCD_NM,
    OVERSEAS_MANUFACTURER: p.OVSMNFST_NM,
  }));
  return { totalCount: products.length, products };
}

// 소스를 순서대로 조회해 처음 결과가 나오는 곳을 사용.
// 소스 하나가 실패해도(예: 식품안전나라 주간 제한 운영) 다음 소스로 넘어감
// HACCP을 가장 먼저 시도 — 이미지를 제공하는 유일한 소스라, 커버리지가 훨씬 넓은
// C002(searchGeneral)를 앞에 두면 이미지 없는 결과가 거의 항상 먼저 잡혀버림
export async function searchSupplementFallback(keyword) {
  if (USE_MOCK_DATA) {
    const products = MOCK_PRODUCTS.filter((p) => p._source && matchMockProduct(keyword, p));
    return { totalCount: products.length, products };
  }
  const sources = [searchHaccp, searchGeneral, searchImported];
  for (const search of sources) {
    try {
      const { products, totalCount } = await search(keyword);
      if (products.length > 0) return { products, totalCount };
    } catch {
      // 다음 소스 시도
    }
  }
  return { products: [], totalCount: 0 };
}
