/**
 * harvest_c003.py가 받아둔 전체 제품에서 '미확인'으로 떨어지는 원료를 빈도순으로 뽑는다.
 *
 * 핵심: 판정 로직을 파이썬으로 다시 구현하지 않고 앱이 실제로 쓰는 JS(parseIngredients /
 * categorize)를 그대로 불러다 쓴다. 다시 구현하면 사전을 고칠 때마다 분석 결과와 화면
 * 판정이 어긋날 수 있기 때문. 사전도 백엔드 API에서 받아와 앱과 같은 상태로 맞춘다.
 *
 * 사용법:
 *   node --experimental-strip-types 없이 그냥 실행하려면 esbuild 번들이 필요하므로
 *   run_analyze.sh 를 쓸 것. (이 파일 단독 실행은 import 해석이 안 됨)
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseIngredients } from '../src/utils/parseIngredients.js';
import { setCategoryDict } from '../src/data/ingredientCategory.js';

// esbuild가 이 파일을 프로젝트 루트에 번들해서 실행하므로 import.meta.url은 기준이 될 수 없음.
// run_analyze.sh가 항상 프로젝트 루트에서 실행하므로 cwd 기준으로 잡는다.
const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const RAW_PATH = path.join(DATA_DIR, 'c003_raw.json');
const OUT_PATH = path.join(DATA_DIR, 'unknown_ranked.json');
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

// 이름만으로는 정말 알 수 없어 의도적으로 미확인으로 두는 것들 — 사전에 넣어봤자
// 오분류 위험만 커지므로 후보 목록에서 미리 걸러 실제로 손댈 만한 것만 남긴다
const HOPELESS_PATTERNS = [
  /혼합제제/, /기타가공품/, /혼합추출물/, /혼합분말/, /복합물/, /추출물분말$/,
];

async function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`원본이 없습니다: ${RAW_PATH}\n먼저 python harvest_c003.py 를 실행하세요.`);
    process.exit(1);
  }

  // 앱과 같은 사전 상태로 맞춤
  const res = await fetch(`${BACKEND_URL}/api/ingredients/categories`);
  if (!res.ok) throw new Error(`사전 조회 실패: HTTP ${res.status} (백엔드가 떠 있는지 확인)`);
  const dict = await res.json();
  setCategoryDict(dict);
  console.log(`사전 ${Object.keys(dict).length}개 로드`);

  const products = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8'));
  console.log(`제품 ${products.length.toLocaleString()}건 분석 중...`);

  const counts = new Map(); // 원료명 → { count, products: [예시 제품명] }
  const categoryTally = { functional: 0, additive: 0, base: 0, unknown: 0 };
  let ingredientTotal = 0;

  for (const p of products) {
    for (const ing of parseIngredients(p.RAWMTRL_NM, p.PRIMARY_FNCLTY)) {
      ingredientTotal++;
      categoryTally[ing.category] = (categoryTally[ing.category] ?? 0) + 1;
      if (ing.category !== 'unknown') continue;

      const entry = counts.get(ing.name) ?? { count: 0, samples: [] };
      entry.count++;
      if (entry.samples.length < 3) entry.samples.push(p.PRDLST_NM);
      counts.set(ing.name, entry);
    }
  }

  const ranked = [...counts.entries()]
    .map(([name, v]) => ({
      name,
      count: v.count,
      samples: v.samples,
      hopeless: HOPELESS_PATTERNS.some((re) => re.test(name)),
    }))
    .sort((a, b) => b.count - a.count);

  const actionable = ranked.filter((r) => !r.hopeless);

  fs.writeFileSync(OUT_PATH, JSON.stringify(ranked, null, 2), 'utf-8');

  const pct = (n) => `${((n / ingredientTotal) * 100).toFixed(1)}%`;
  console.log(
    `\n성분 등장 ${ingredientTotal.toLocaleString()}회 (고유 미확인 ${ranked.length.toLocaleString()}종)\n` +
      `  기능성원료 ${categoryTally.functional.toLocaleString()} (${pct(categoryTally.functional)})\n` +
      `  첨가물     ${categoryTally.additive.toLocaleString()} (${pct(categoryTally.additive)})\n` +
      `  식품 원료  ${categoryTally.base.toLocaleString()} (${pct(categoryTally.base)})\n` +
      `  미확인     ${categoryTally.unknown.toLocaleString()} (${pct(categoryTally.unknown)})\n`
  );

  console.log(`손댈 만한 미확인 상위 40종 (이름만으로 알 수 없는 것 제외):`);
  for (const [i, r] of actionable.slice(0, 40).entries()) {
    console.log(`${String(i + 1).padStart(3)}. ${r.count.toString().padStart(5)}회  ${r.name}`);
  }
  console.log(`\n전체 순위 → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
