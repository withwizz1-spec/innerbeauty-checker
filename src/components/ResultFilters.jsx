const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'certified', label: '인증 기능식품만' },
  { id: 'unknown', label: '낯선 원료 포함' },
  { id: 'noAllergy', label: '알레르기 성분 제외' },
]

const SORTS = [
  { id: 'relevance', label: '정확도순' },
  { id: 'unknownDesc', label: '낯선 원료 많은 순' },
  { id: 'warningAsc', label: '경고 성분 적은 순' },
]

// 결과 목록 위의 필터 칩 + 정렬 선택
function ResultFilters({ filter, onFilterChange, sort, onSortChange, counts }) {
  return (
    <div className="result-filters">
      <div className="filter-chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => onFilterChange(f.id)}
            aria-pressed={filter === f.id}
          >
            <span className="filter-dot" />
            {f.label}
            {counts?.[f.id] !== undefined && <em>{counts[f.id]}</em>}
          </button>
        ))}
      </div>

      <label className="sort-field">
        <span>정렬</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default ResultFilters
