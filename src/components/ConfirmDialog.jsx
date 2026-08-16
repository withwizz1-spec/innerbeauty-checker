import { useEffect } from 'react'

// 확인/취소 두 갈래만 있는 간단한 모달 — 지금은 "찜하려면 로그인이 필요해요" 안내에 쓰임
// (브라우저 기본 confirm 대신 쓰는 이유: 앱 톤과 맞추고 문구를 자유롭게 쓰기 위해)
function ConfirmDialog({ open, title, message, confirmLabel = '확인', onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      {/* 카드 안쪽 클릭이 배경 클릭으로 새어나가 창이 닫히지 않도록 차단 */}
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        {message && <p className="dialog-message">{message}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn-plain" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
