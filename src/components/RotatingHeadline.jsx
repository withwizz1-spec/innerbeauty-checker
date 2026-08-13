// 검색 결과 화면 상단 문구 — 따옴표 한 쌍 안에서 단어만 세로로 굴러가며 교체됨
// 굴림은 전부 CSS 애니메이션이라 리렌더가 없음 (WORDS 마지막에 첫 단어를 한 번 더 넣어 이음매 없이 순환)
const WORDS = ['영양제', '효소', '쉐이크', '유산균', '콜라겐', '프로틴']

function RotatingHeadline() {
  return (
    <p className="results-headline">
      오늘 먹은 ‘
      <span className="roll-slot">
        <span className="roll-track">
          {[...WORDS, WORDS[0]].map((word, i) => (
            <span key={i}>{word}</span>
          ))}
        </span>
      </span>
      ’에 들어있는 성분은?
    </p>
  )
}

export default RotatingHeadline
