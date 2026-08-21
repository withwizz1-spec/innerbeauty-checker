/**
 * 성분 분류 회귀 확인 — 사전·패턴을 고칠 때마다 기존 판정이 깨지지 않는지 본다.
 *
 * 사전이 커질수록 이름끼리 겹치는 일이 늘어나므로(부분 문자열 매칭이라),
 * 일부러 서로 잡아먹기 쉬운 쌍을 골라 고정해 둔다.
 *
 * 실행: ./backend/run_check.sh   (백엔드가 떠 있어야 함 — 사전을 API로 받아옴)
 */

import { categorize, setCategoryDict } from '../src/data/ingredientCategory.js';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

// [성분명, 기대 분류, 메모]
const CASES = [
  // 서로 부분 문자열이라 잡아먹기 쉬운 쌍들 (2026-08-18 사전 확장 때 고정)
  ['밀가루', 'base', '밀크씨슬(기능성)에 안 걸려야 함'],
  ['밀크씨슬추출물', 'functional', ''],
  ['대두', 'base', ''],
  ['대두레시틴', 'additive', '대두(식품)가 가로채면 안 됨'],
  ['옥수수전분', 'base', ''],
  ['변성전분', 'additive', ''],
  ['블루베리', 'base', ''],
  ['빌베리추출물', 'functional', ''],
  ['키위', 'base', ''],
  ['키위향', 'additive', '식품 원료 키위보다 향료 패턴이 먼저여야 함'],

  // 이름에 기능성 미네랄이 들어간 첨가물 — 첨가물 사전을 먼저 보는 이유
  ['스테아린산마그네슘', 'additive', ''],
  ['카복시메틸셀룰로스칼슘', 'additive', '칼슘 때문에 기능성으로 잡히던 오분류'],

  // 표기 흔들림
  ['결정셀룰로스', 'additive', '사전은 결정셀룰로오스'],
  ['코엔자임 Q10', 'functional', '사전은 코엔자임큐텐'],
  ['식용색소적색제40호', 'additive', '색소로 끝나지 않는 표기'],

  // 평범한 식품 — 미확인으로 떨어지면 안 됨
  ['정제수', 'base', ''],
  ['우유', 'base', ''],

  // 2026-08-20 추가: 유산균 학명 / L-아미노산 패턴
  ['Lactiplantibacillus plantarum', 'functional', '유산균 학명'],
  ['Bifidobacterium animalis ssp. lactis', 'functional', '유산균 학명'],
  ['Lacticaseibacillus rhamnosus', 'functional', '유산균 학명'],
  ['Streptococcus thermophilus', 'functional', '유산균 학명'],
  ['L-아르지닌', 'functional', 'L-아미노산'],
  ['L-카르니틴', 'functional', 'L-아미노산'],
  ['D-말티톨', 'additive', 'D-는 기능성 패턴에서 제외 → 당알코올 감미료로 잡혀야 함'],

  // 2026-08-20 추가: 가공품(식품유형 표기) / 올리고당·당알코올
  ['곡류가공품', 'base', '식품 종류를 알 수 있으면 식품 원료'],
  ['기타 농산가공품', 'base', ''],
  ['기타가공품', 'unknown', '식품 종류를 전혀 알 수 없는 표기는 미확인 유지'],
  ['갈락토올리고당', 'base', '"올리고당" 한 항목으로 커버'],
  ['이소말토올리고당', 'base', ''],
  ['폴리글리시톨시럽', 'additive', '시럽이 붙어도 당알코올이라 첨가물'],
  ['말티톨시럽', 'additive', ''],
  ['메이플시럽', 'base', '천연 시럽은 식품 — 첨가물 사전에 안 걸려야 함'],

  // 2026-08-20 추가: 상위 미확인 개별 등록분
  ['엠에스엠', 'functional', ''],
  ['피리독신염산염', 'functional', '비타민B6의 다른 이름'],
  ['은행잎추출물', 'functional', ''],
  ['소르비탄지방산에스테르', 'additive', '유화제'],
  ['자당지방산에스테르', 'additive', '식품 원료 "자당"에 안 뺏겨야 함'],
  ['글루콘산동', 'additive', '영양강화제'],
  ['카민', 'additive', '이름에 "색소"가 없는 색소'],
  ['요구르트향분말', 'additive', '향분말 패턴 — 식품 원료 "요구르트"보다 먼저'],
  ['요거트분말', 'base', '향료가 아니면 식품'],
  ['정향', 'base', '"향"으로 끝나지만 향료가 아니라 향신료'],
  ['대나무수액', 'base', ''],
  ['마카추출분말', 'base', ''],

  // 2026-08-21 추가: 추출물류
  ['강황추출물', 'functional', '울금과 같은 식물 — 기존 사전과 일관성'],
  ['흑삼농축액', 'functional', '인삼·홍삼과 같은 계열'],
  ['미르틸루스산앵도열매추출물', 'functional', '빌베리의 다른 이름'],
  ['참당귀추출분말', 'base', '공식 기능성 원료가 아닌 식물'],
  ['병풀잎추출물', 'base', '"병풀" 어근 하나로 커버'],
  ['버드나무가지껍질추출분말', 'base', ''],
  ['호박추출물', 'base', ''],
  ['호박산나트륨', 'additive', '산도조절제 — 식품 "호박"에 안 뺏겨야 함'],
  ['덩굴월귤농축분말', 'base', '크랜베리(base)와 같은 것'],
  ['식물혼합농축액', 'unknown', '무엇이 섞였는지 안 적혀 있으면 미확인 유지'],

  // 2026-08-21 (2차)
  ['NAG', 'functional', 'N-아세틸글루코사민'],
  ['뮤코다당.단백', 'functional', ''],
  ['동결건조로얄젤리분말', 'functional', ''],
  ['Clostridium butyricum strain Miyairi', 'functional', '프로바이오틱스 학명 패턴'],
  ['l-멘톨', 'additive', '소문자 l- 이라 L-아미노산 패턴에 안 걸림 → 멘톨(향료)로 잡힘'],
  ['캡슐류', 'additive', ''],
  ['분말유크림', 'base', ''],

  // 이름만으로는 정말 알 수 없는 것 — 억지로 분류하지 않고 미확인 유지
  ['식물혼합추출물분말', 'unknown', ''],
  ['혼합제제', 'unknown', ''],
];

const res = await fetch(`${BACKEND_URL}/api/ingredients/categories`);
if (!res.ok) throw new Error(`사전 조회 실패: HTTP ${res.status} (백엔드가 떠 있는지 확인)`);
setCategoryDict(await res.json());

let failed = 0;
for (const [name, expected, memo] of CASES) {
  const actual = categorize(name, null);
  if (actual === expected) continue;
  failed++;
  console.log(`  FAIL  ${name}\n        기대 ${expected} / 실제 ${actual}${memo ? `  — ${memo}` : ''}`);
}

console.log(
  failed === 0
    ? `\n${CASES.length}개 케이스 전부 통과`
    : `\n${CASES.length}개 중 ${failed}개 실패`
);
process.exit(failed === 0 ? 0 : 1);
