import { useEffect } from 'react'

// 화면을 덮는 범용 팝업 — 성분 상세처럼 "보던 자리를 잃지 않고" 열어야 하는 내용에 씀
// (배경 클릭·Esc·닫기 버튼으로 닫힘)
function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    // 팝업이 열려 있는 동안 뒤쪽 본문이 같이 스크롤되지 않도록 잠금
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* 카드 안쪽 클릭이 배경 클릭으로 번져 창이 닫히는 것을 막음 */}
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
