import { useState } from 'react'

// 성분표 사진 업로드/촬영 UI — 이미지 선택 + 미리보기까지만 담당
// capture="environment"는 모바일 브라우저에서 후면 카메라를 바로 열어줌 (데스크톱에서는 무시되고 파일 선택창만 뜸)
function ImageScanUpload() {
  const [previewUrl, setPreviewUrl] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        건강기능식품 뒷면의 성분표를 촬영하거나 사진을 올려주세요.
      </p>

      <label className="upload-dropzone">
        <span className="upload-icon" aria-hidden="true">
          📷
        </span>
        <span className="upload-title">사진 촬영 / 업로드</span>
        <span className="upload-subtitle">JPG, PNG 지원</span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </label>

      {previewUrl && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <img
            src={previewUrl}
            alt="업로드한 성분표"
            style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }}
          />
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            성분표 분석 기능은 다음 단계에서 연동될 예정이에요.
          </p>
        </div>
      )}
    </div>
  )
}

export default ImageScanUpload
