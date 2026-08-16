// 제품을 찜하는 하트 버튼 — 찜한 상태면 채워진 하트로 바뀜
// 로그인하지 않았으면 onRequireLogin을 호출해 안내 창을 띄운다 (로그인 여부 판단은 App이 함)
function FavoriteButton({ favorited, onToggle, size = 'md' }) {
  return (
    <button
      type="button"
      className={`favorite-btn ${size} ${favorited ? 'on' : ''}`}
      aria-pressed={favorited}
      aria-label={favorited ? '찜 해제' : '찜하기'}
      title={favorited ? '찜 해제' : '찜하기'}
      onClick={(e) => {
        e.stopPropagation() // 카드 클릭(상세 이동)으로 번지지 않도록
        onToggle()
      }}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}

export default FavoriteButton
