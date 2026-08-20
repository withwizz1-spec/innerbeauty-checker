import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import AppNav from './AppNav';
import ImageScanUpload from './ImageScanUpload';
import { fetchModeWarnings } from '../api/authApi';
import { fetchPreviewProduct } from '../utils/getPreviewProduct';
import { maskBrandName } from '../utils/maskBrandName';
import { parseIngredients } from '../utils/parseIngredients';
import './capsule-layout-green.css';

// InnerBeauty Checker — 캡슐 레이아웃 + 그린 톤앤매너 병합 버전
// App.jsx의 screen === 'home' 분기에서 렌더링됨
//
// 히어로 구조(2026-08-20): 예전엔 히어로 / 확인 화면 미리보기 / 문제 카드 3개가 각각 별도 섹션이었는데,
// "이 앱이 뭘 하는지"가 첫 화면에서 끝나도록 셋을 히어로 한 덩어리로 합쳤음.
// 확인 카드는 이 앱의 결과물을 보여주는 유일한 실물이라 항상 고정 노출하고, 문제 카드만 그 아래에서 순환.

// 브랜드명 일부를 마스킹한 예시 — 실제 성분명이 아니라 "어떤 제품을 검색하는지" 감이 오도록
const SCAN_QUERIES = [
  '비X랩 콜라겐 원재료 분석 중...',
  '락X핏 인증여부 확인 중...',
  '이X랩 알레르기 성분 확인 중...',
  '닥X린 주의성분 확인 중...',
];

// "이런 경험, 있으신가요" — 예전 cg-problems 섹션의 문구를 그대로 옮김
const PROBLEM_CARDS = [
  {
    badge: '인증여부',
    question: '공동구매로 샀는데, 이거 진짜 건강기능식품 맞을까? 🧐',
    answer: '식약처에 등록된 제품인지 조회해, 정식 인증 제품인지 일반 가공식품인지 뱃지로 구분해드려요.',
  },
  {
    badge: '위험성분',
    question: '원재료명이 깨알같아서 뭐가 위험한건지 모르겠어..🥹',
    answer: '원재료를 하나씩 쪼개서 알레르기 유발물질과 해외 논란 성분을 표시하고, 성분마다 등급을 매겨드려요.',
  },
  {
    badge: '맞춤 필터',
    question: '임신 중인데 이거 먹어도 될까? 🥺',
    answer: '임산부·노인 모드를 켜거나 내 알레르기 19종을 등록해두면, 주의할 성분만 눈에 띄게 표시해드려요.',
  },
];

// 성분·건강식품 정보성 카드 — ⚠️ 아직 확정 전 자리표시용 내용이다.
// 아직 정해지지 않은 것: 직접 작성할지 외부 기사 링크만 걸지(요약 게시는 저작권 리스크),
// 몇 개를 어떤 주제로 다룰지, 클릭 시 뜰 팝업 레이아웃. 읽는 시간(3분 등)도 임시값.
const ARTICLES = [
  {
    key: 'cmc',
    tag: '성분 상식',
    icon: '🧪',
    title: '카복시메틸셀룰로스칼슘, 알고 보면 흔한 증점제예요',
    summary:
      '이름은 낯설고 복잡해 보이지만, 식품 농도를 잡아주는 흔한 첨가물이에요. 낯선 이름 = 위험한 성분이 아닌 이유를 짚어봐요.',
    meta: '성분 상식 · 3분',
  },
  {
    key: 'unknown',
    tag: '이 앱의 원칙',
    icon: '❓',
    title: "'미확인' 등급, 위험하다는 뜻이 아니에요",
    summary: '공식 문구·사전에 없어 자동 분류를 못 했을 뿐, 이미 식약처 심사를 거친 원료예요.',
    meta: '2분',
  },
  {
    key: 'allergen',
    tag: '제도',
    icon: '🏷️',
    title: '알레르기 표시대상 21종, 다 알고 계셨나요',
    summary: '식약처가 정한 공식 표시 대상 성분을 한눈에 정리했어요.',
    meta: '4분',
  },
  {
    key: 'tocopherol',
    tag: '성분 상식',
    icon: '🔤',
    title: '토코페롤 = 비타민E, 같은 성분 다른 이름들',
    summary: '성분표에 이름이 여러 개로 등장하는 흔한 이유를 정리했어요.',
    meta: '2분',
  },
  {
    key: 'controversial',
    tag: '해외 동향',
    icon: '🌍',
    title: '해외에서 논란이 됐던 첨가물 6가지',
    summary: 'WHO·EU·영국 FSA 등에서 다뤄진 첨가물을 참고용으로 정리했어요.',
    meta: '5분',
  },
];

// "실제 확인 화면 미리보기" 카드 초기값 — 실제 데이터 로딩 전이나, 조회가 전부 실패했을 때의 fallback
const FALLBACK_PREVIEW = {
  name: '프로폴리스 프로바이오틱스',
  isHealthFunctional: false,
  allergenNames: ['대두', '우유'],
  unknownNames: ['카복시메틸셀룰로스칼슘'],
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
  // 이 앱의 핵심 차별점 — 사전에도 공식 문구에도 없어 자동 분류가 안 된 '낯선 원료'
  const unknownNames = ingredients.filter((i) => i.category === 'unknown').map((i) => i.name);
  const pregnancyHit = ingredients.some((i) => pregnantWarnings[i.name]);

  return {
    name: maskBrandName(product.PRDLST_NM),
    isHealthFunctional: !product._source,
    allergenNames,
    unknownNames,
    pregnancyHit,
  };
}

// 여러 개일 때 "첫 번째 외 N개"로 줄여서 한 줄에 들어가게 함
function summarizeNames(names, emptyText) {
  if (!names || names.length === 0) return emptyText;
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}개`;
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

// paused가 true면 타이핑을 멈추고 문구를 비움 — 사용자가 검색창을 클릭해 직접 입력하려는 순간에
// placeholder가 계속 바뀌면 방해가 되기 때문
function useTypingSearch(paused) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (paused) {
      setText('');
      return;
    }

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
  }, [paused]);

  return text;
}

// 검색 결과 화면과 같은 항목을 보여주는 미리보기 카드 (항상 고정 노출)
function ProductCheckCard({ preview }) {
  return (
    <div className="cg-check-card">
      <div className="cg-check-top">
        <span>지금 확인 중</span>
        <strong>{preview.name}</strong>
      </div>
      <div className="cg-check-bar">
        <div className="cg-check-bar-fill" />
      </div>

      <div className="cg-check-row">
        <span className="cg-check-label">인증 구분</span>
        <span className={`cg-check-value ${preview.isHealthFunctional ? 'cg-v-ok' : 'cg-v-warn'}`}>
          {preview.isHealthFunctional ? '건강기능식품 인증' : '건강기능식품 아님'}
        </span>
      </div>
      <div className="cg-check-row">
        <span className="cg-check-label">알레르기 유발성분</span>
        <span className={`cg-check-value ${preview.allergenNames.length > 0 ? 'cg-v-danger' : 'cg-v-ok'}`}>
          {preview.allergenNames.length > 0 ? `${preview.allergenNames.join(', ')} 포함` : '해당 없음'}
        </span>
      </div>
      {/* '낯선 원료'는 이 앱의 핵심 차별점이라 다른 줄과 구분되게 강조 */}
      <div className="cg-check-row cg-check-row-key">
        <span className="cg-check-label">낯선 원료</span>
        <span className="cg-check-value cg-v-key">
          {summarizeNames(preview.unknownNames, '없음')}
        </span>
      </div>
      <div className="cg-check-row">
        <span className="cg-check-label">임산부 섭취</span>
        <span className={`cg-check-value ${preview.pregnancyHit ? 'cg-v-danger' : 'cg-v-ok'}`}>
          {preview.pregnancyHit ? '권장하지 않음' : '섭취 가능'}
        </span>
      </div>
    </div>
  );
}

// 문제 카드 캐러셀 — 자동으로 넘어가되 마우스를 올리거나 키보드 포커스가 들어오면 멈춤
function ProblemCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [height, setHeight] = useState(null);
  const slideRefs = useRef([]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PROBLEM_CARDS.length);
    }, 5000);
    return () => clearInterval(id);
  }, [paused]);

  // 카드마다 문장 길이가 달라 높이가 제각각 — 보이는 영역을 현재 카드 높이에 맞춰 따라가게 함
  // (가장 긴 카드에 맞추면 짧은 카드에서 빈 공간이 생김)
  useLayoutEffect(() => {
    function sync() {
      const el = slideRefs.current[index];
      if (el) setHeight(el.offsetHeight);
    }
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [index]);

  function move(step) {
    setIndex((i) => (i + step + PROBLEM_CARDS.length) % PROBLEM_CARDS.length);
  }

  return (
    <div
      className="cg-q-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" className="cg-q-arrow cg-q-arrow-prev" onClick={() => move(-1)} aria-label="이전 카드">
        ‹
      </button>
      <button type="button" className="cg-q-arrow cg-q-arrow-next" onClick={() => move(1)} aria-label="다음 카드">
        ›
      </button>

      <div className="cg-q-viewport" style={height ? { height } : undefined}>
        <div
          className="cg-q-track"
          style={{ transform: `translateX(-${index * (100 / PROBLEM_CARDS.length)}%)` }}
        >
          {PROBLEM_CARDS.map((card, i) => (
            <div
              className="cg-q-slide"
              key={card.badge}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
            >
              <div className="cg-q-card">
                <span className="cg-q-badge">
                  <span className="cg-capsule cg-q-badge-capsule" />
                  {card.badge}
                </span>
                <div className="cg-q-row">
                  <span className="cg-q-person" />
                  <span className="cg-q-bubble">{card.question}</span>
                </div>
                <p className="cg-q-answer">{card.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cg-q-dots">
        {PROBLEM_CARDS.map((card, i) => (
          <button
            type="button"
            key={card.badge}
            className={i === index ? 'active' : ''}
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}번 카드`}
          />
        ))}
      </div>
    </div>
  );
}

export default function CapsuleLayoutGreen({
  keyword,
  onKeywordChange,
  onSearch,
  user,
  onAuthClick,
  onLogout,
  onFavorites,
  favoriteCount,
}) {
  const rootRef = useRevealOnScroll();
  const [searchFocused, setSearchFocused] = useState(false);
  const searchText = useTypingSearch(searchFocused);
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
        onFavorites={onFavorites}
        favoriteCount={favoriteCount}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onCta={scrollToSearch}
      />

      <header className="cg-hero">
        <div className="cg-container cg-hero-inner">
          <div className="cg-hero-grid">
            <div className="cg-hero-left">
              {/* 떠다니는 캡슐 — 왼쪽 칼럼 기준으로 배치. 예전엔 히어로 전체 기준 right였는데,
                  2단이 되면서 오른쪽 확인 카드 위에 겹쳐서 제목 옆으로 옮김 */}
              <span className="cg-float-capsule cg-fc1" />
              <span className="cg-float-capsule cg-fc2" />
              <span className="cg-float-capsule cg-fc3" />

              <h1>
                이 건강식품, 진짜<br />
                <span className="cg-accent">인증받은 기능식품</span>이<br />
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
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder={searchText}
                      aria-label="제품명 검색"
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

            <div className="cg-hero-right">
              <ProductCheckCard preview={preview} />
              <ProblemCarousel />
            </div>
          </div>
        </div>
      </header>

      <section className="cg-articles">
        <div className="cg-container">
          <div className="cg-articles-head cg-reveal">
            <h2 className="cg-section-title">요즘 건강식품, 이런 이야기가 있어요</h2>
            <span className="cg-articles-eyebrow">INGREDIENT NEWS</span>
          </div>

          <div className="cg-article-grid">
            {ARTICLES.map((article, i) => (
              <article
                key={article.key}
                className={`cg-article-card cg-reveal ${i === 0 ? 'cg-article-feat' : ''}`}
              >
                <div className="cg-article-thumb">{article.icon}</div>
                <div className="cg-article-body">
                  <span className="cg-article-tag">{article.tag}</span>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <span className="cg-article-meta">{article.meta}</span>
                </div>
              </article>
            ))}
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
