import { useEffect, useRef, useState } from 'react';
import AppNav from './AppNav';
import ImageScanUpload from './ImageScanUpload';
import { fetchModeWarnings } from '../api/authApi';
import { fetchPreviewProduct } from '../utils/getPreviewProduct';
import { maskBrandName } from '../utils/maskBrandName';
import { parseIngredients } from '../utils/parseIngredients';
import './capsule-layout-green.css';

// InnerBeauty Checker — 캡슐 레이아웃 + 그린 톤앤매너 병합 버전
// App.jsx의 screen === 'home' 분기에서 렌더링됨

// 브랜드명 일부를 마스킹한 예시 — 실제 성분명이 아니라 "어떤 제품을 검색하는지" 감이 오도록
const SCAN_QUERIES = [
  '비X랩 콜라겐 원재료 분석 중...',
  '락X핏 인증여부 확인 중...',
  '이X랩 알레르기 성분 확인 중...',
  '닥X린 주의성분 확인 중...',
];

// "실제 확인 화면 미리보기" 카드 초기값 — 실제 데이터 로딩 전이나, 조회가 전부 실패했을 때의 fallback
const FALLBACK_PREVIEW = {
  name: '프로폴리스 프로바이오틱스',
  isHealthFunctional: false,
  allergenNames: ['대두', '우유'],
  cautionNames: ['카페인'],
  pregnancyHit: true,
};

// 인기 브랜드 키워드로 실제 검색해 미리보기 카드에 쓸 데이터를 만듦 (성분 등급·알레르기·임산부 주의는
// 실제 화면(ProductDetail)과 같은 로직 — parseIngredients + mode-warnings 사전을 그대로 재사용)
async function buildPreview() {
  const product = await fetchPreviewProduct();
  if (!product) return null;

  const pregnantWarnings = await fetchModeWarnings('pregnant').catch(() => ({}));
  const ingredients = parseIngredients(product.RAWMTRL_NM, product.PRIMARY_FNCLTY);
  const allergenNames = [...new Set(ingredients.flatMap((i) => i.allergens))];
  const cautionNames = ingredients
    .filter((i) => i.grade === 'warning' && i.allergens.length === 0)
    .map((i) => i.name);
  const pregnancyHit = ingredients.some((i) => pregnantWarnings[i.name]);

  return {
    name: maskBrandName(product.PRDLST_NM),
    isHealthFunctional: !product._source,
    allergenNames,
    cautionNames,
    pregnancyHit,
  };
}

function useRevealOnScroll() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.cg-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cg-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return rootRef;
}

function useTypingSearch() {
  const [text, setText] = useState('');

  useEffect(() => {
    let pIndex = 0;
    let cIndex = 0;
    let deleting = false;
    let timeoutId;

    function tick() {
      const current = SCAN_QUERIES[pIndex];
      if (!deleting) {
        cIndex++;
        setText(current.slice(0, cIndex));
        if (cIndex === current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 1400);
          return;
        }
      } else {
        cIndex--;
        setText(current.slice(0, cIndex));
        if (cIndex === 0) {
          deleting = false;
          pIndex = (pIndex + 1) % SCAN_QUERIES.length;
        }
      }
      timeoutId = setTimeout(tick, deleting ? 28 : 55);
    }

    tick();
    return () => clearTimeout(timeoutId);
  }, []);

  return text;
}

export default function CapsuleLayoutGreen({ keyword, onKeywordChange, onSearch, user, onAuthClick, onLogout }) {
  const rootRef = useRevealOnScroll();
  const searchText = useTypingSearch();
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'scan'
  const [preview, setPreview] = useState(FALLBACK_PREVIEW);

  // 방문 시 한 번, 인기 브랜드로 실제 검색해 미리보기 카드를 실데이터로 교체 (실패하면 fallback 유지)
  useEffect(() => {
    let cancelled = false;
    buildPreview().then((result) => {
      if (!cancelled && result) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // CTA 버튼 공용 핸들러 — 별도 검색 페이지 라우트가 없어서, 히어로 검색창으로 스크롤+포커스 이동시킴
  // 스캔 탭이 켜져 있으면 검색 탭으로 먼저 전환(입력창이 DOM에 있어야 포커스 가능)
  function scrollToSearch(e) {
    e.preventDefault();
    setActiveTab('search');
    requestAnimationFrame(() => {
      const input = document.getElementById('cg-hero-search-input');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
    });
  }

  return (
    <div className="cg-root" ref={rootRef}>
      <AppNav
        user={user}
        onAuthClick={onAuthClick}
        onLogout={onLogout}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onCta={scrollToSearch}
      />

      <header className="cg-hero">
        <div className="cg-container cg-hero-inner">
          <span className="cg-float-capsule cg-fc1" />
          <span className="cg-float-capsule cg-fc2" />
          <span className="cg-float-capsule cg-fc3" />

          <h1>
            이 건강식품,<br />
            진짜 <span className="cg-accent">인증받은 기능식품</span>이<br />
            맞을까요?
          </h1>
          <p className="cg-hero-sub">
            SNS 공동구매, 인플루언서 추천…<br />
            정작 성분표는 아무도 읽지 않습니다.<br />
            제품명만 넣으면 식약처에 등록된 진짜 정보를 확인해드려요.
          </p>

          <div id="cg-search" className="cg-hero-tabs">
            <button
              type="button"
              className={`cg-hero-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              제품명 검색
            </button>
            <button
              type="button"
              className={`cg-hero-tab ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => setActiveTab('scan')}
            >
              성분표 스캔
            </button>
          </div>

          {activeTab === 'scan' ? (
            <div className="cg-hero-scan">
              <ImageScanUpload />
            </div>
          ) : (
            <form className="cg-hero-search" onSubmit={onSearch}>
              <div className="cg-hero-search-box">
                <input
                  id="cg-hero-search-input"
                  type="text"
                  value={keyword}
                  onChange={(e) => onKeywordChange(e.target.value)}
                  placeholder={searchText}
                />
              </div>
              <button type="submit" className="cg-hero-search-btn">성분 확인</button>
            </form>
          )}

          {/* 신뢰 칩 — 원래 페이지 하단에 있던 것을 히어로로 올림 */}
          <div className="cg-hero-tags">
            <span className="cg-hero-tag">
              <span className="cg-capsule" style={{ width: 16, height: 8 }} />
              <span><strong>식약처 공공데이터포털</strong> 기반 데이터</span>
            </span>
            <span className="cg-hero-tag">
              <span className="cg-capsule" style={{ width: 16, height: 8 }} />
              <span>올리브영·약국 유통 제품 커버</span>
            </span>
            <span className="cg-hero-tag">
              <span className="cg-capsule" style={{ width: 16, height: 8 }} />
              <span>원재료 성분별 안전성 분석</span>
            </span>
          </div>
        </div>
      </header>

      <section className="cg-scan">
        <div className="cg-container">
          <div className="cg-section-eyebrow cg-reveal">실제 확인 화면 미리보기</div>
          <h2 className="cg-section-title cg-reveal">검색 한 번이면, 이렇게 보여드려요</h2>

          <div className="cg-scan-wrap cg-reveal">
            <div className="cg-scan-input">
              <div className="cg-scan-product">
                지금 확인 중
                <strong>{preview.name}</strong>
              </div>
              <div className="cg-scan-progress">
                <div className="cg-scan-progress-bar" />
              </div>
              <div className="cg-scan-status">식약처 데이터베이스 대조 중…</div>
            </div>
            <div className="cg-scan-result">
              <div className="cg-scan-result-row">
                <span className="cg-scan-result-label">인증 구분</span>
                <span className={`cg-scan-result-value ${preview.isHealthFunctional ? 'cg-v-ok' : 'cg-v-warn'}`}>
                  {preview.isHealthFunctional ? '건강기능식품 인증' : '건강기능식품 아님'}
                </span>
              </div>
              <div className="cg-scan-result-row">
                <span className="cg-scan-result-label">알레르기 유발성분</span>
                <span className={`cg-scan-result-value ${preview.allergenNames.length > 0 ? 'cg-v-danger' : 'cg-v-ok'}`}>
                  {preview.allergenNames.length > 0 ? `${preview.allergenNames.join(', ')} 포함` : '해당 없음'}
                </span>
              </div>
              <div className="cg-scan-result-row">
                <span className="cg-scan-result-label">주의성분</span>
                <span className={`cg-scan-result-value ${preview.cautionNames.length > 0 ? 'cg-v-warn' : 'cg-v-ok'}`}>
                  {preview.cautionNames.length > 0 ? `${preview.cautionNames.join(', ')} 함유` : '특이사항 없음'}
                </span>
              </div>
              <div className="cg-scan-result-row">
                <span className="cg-scan-result-label">임산부 섭취</span>
                <span className={`cg-scan-result-value ${preview.pregnancyHit ? 'cg-v-danger' : 'cg-v-ok'}`}>
                  {preview.pregnancyHit ? '권장하지 않음' : '섭취 가능'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cg-problems">
        <div className="cg-container">
          <div className="cg-section-eyebrow cg-reveal">이런 경험, 있으신가요</div>
          <h2 className="cg-section-title cg-reveal">
            전문가도, 인플루언서도 아닌<br />내가 직접 확인할 수 있어야 합니다
          </h2>
          {/* 문제(사용자 질문) → 해결(기능)을 카드 하나에 묶음 — 예전 '핵심 기능' 섹션을 여기로 병합 */}
          <div className="cg-problem-grid">
            <div className="cg-problem-card cg-reveal">
              <div className="cg-problem-card-head">
                <span className="cg-capsule cg-problem-num-capsule" />
                <span className="cg-problem-badge">인증여부</span>
              </div>
              <h3>&quot;공동구매로 샀는데, 이거 진짜 건강기능식품 맞나?&quot;</h3>
              <p>식약처에 등록된 제품인지 조회해, 정식 인증 제품인지 일반 가공식품인지 뱃지로 구분해드려요.</p>
            </div>
            <div className="cg-problem-card cg-reveal">
              <div className="cg-problem-card-head">
                <span className="cg-capsule cg-problem-num-capsule" />
                <span className="cg-problem-badge">위험성분</span>
              </div>
              <h3>&quot;원재료명이 깨알같은데, 뭐가 위험한 건지 모르겠다&quot;</h3>
              <p>원재료를 하나씩 쪼개서 알레르기 유발물질과 해외 논란 성분을 표시하고, 성분마다 등급을 매겨드려요.</p>
            </div>
            <div className="cg-problem-card cg-reveal">
              <div className="cg-problem-card-head">
                <span className="cg-capsule cg-problem-num-capsule" />
                <span className="cg-problem-badge">맞춤 필터</span>
              </div>
              <h3>&quot;임신 중인데 이거 먹어도 되나?&quot;</h3>
              <p>임산부·노인 모드를 켜거나 내 알레르기 19종을 등록해두면, 주의할 성분만 눈에 띄게 표시해드려요.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cg-cta">
        <div className="cg-container">
          <h2 className="cg-reveal">지금 먹고 있는 영양제,<br />진짜 확인해본 적 있나요?</h2>
          <p className="cg-cta-sub cg-reveal">검색 한 번으로 인증 여부와 위험성분을 바로 확인하세요.</p>
          <a href="#cg-search" className="cg-cta-btn cg-reveal" onClick={scrollToSearch}>지금 내 영양제 확인하기 →</a>
        </div>
      </section>

      <footer>
        <div className="cg-container cg-footer-inner">
          <span>InnerBeauty Checker</span>
          <span>DATA SOURCE : MFDS OPEN API</span>
        </div>
      </footer>
    </div>
  );
}
