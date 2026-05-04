import { useEffect, useRef, useState, useCallback } from 'react'
import { getAllClips } from '../utils/useDB'
import { groupByDay, formatDate } from '../utils/groupByDay'
import ClipCard from './ClipCard'
import MergeModal from './MergeModal'
import './ArchiveScreen.css'

export default function ArchiveScreen({ onCamera, refresh }) {
  const [groups, setGroups] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [mergeTarget, setMergeTarget] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    getAllClips().then((clips) => setGroups(groupByDay(clips)))
  }, [refresh])

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  function handleDaylog(group) {
    setMergeTarget({ clips: group.clips, label: formatDate(group.date) })
  }

  function handleSelectMerge() {
    if (selected.size === 0) {
      setSelectMode(true)
      return
    }
    const allClips = groups.flatMap((g) => g.clips)
    const clips = allClips
      .filter((c) => selected.has(c.id))
      .sort((a, b) => a.timestamp - b.timestamp)
    setMergeTarget({ clips, label: '선택 영상' })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  const isEmpty = groups.length === 0

  return (
    <div className="archive-screen">
      {/* 헤더 */}
      <div className="archive-header">
        <span className="archive-title">MyDay</span>
        {selectMode ? (
          <button className="archive-cancel" onClick={exitSelectMode}>취소</button>
        ) : (
          <span className="archive-count">
            {groups.flatMap((g) => g.clips).length}개 클립
          </span>
        )}
      </div>

      {/* 영상 목록 */}
      {isEmpty ? (
        <div className="archive-empty">
          <div className="archive-empty-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="8" width="24" height="16" rx="3" stroke="#ccc" strokeWidth="1.5"/>
              <path d="M21 16l-7 4V12l7 4z" fill="#ccc"/>
            </svg>
          </div>
          <p>아직 기록이 없어요</p>
          <button onClick={onCamera}>첫 영상 찍기</button>
        </div>
      ) : (
        <div className="archive-scroll" ref={scrollRef}>
          {groups.map((group) => (
            <div key={group.date} className="archive-day">
              <div className="archive-day-header">
                <span className="archive-day-label">{formatDate(group.date)}</span>
                <button
                  className="archive-daylog-btn"
                  onClick={() => handleDaylog(group)}
                  title="이 날의 데이로그 만들기"
                >
                  데이로그 ↓
                </button>
              </div>

              {/* 카드 스냅 스크롤 영역 */}
              <div className="clips-snap">
                {group.clips.map((clip) => (
                  <div key={clip.id} className="clips-snap-item">
                    <ClipCard
                      clip={clip}
                      selectable={selectMode}
                      selected={selected.has(clip.id)}
                      onSelect={() => toggleSelect(clip.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 하단 버튼 영역 */}
      {!isEmpty && (
        <div className="archive-bottom">
          {selectMode ? (
            <button
              className="archive-merge-confirm"
              onClick={handleSelectMerge}
              disabled={selected.size < 2}
            >
              {selected.size < 2
                ? `영상을 2개 이상 선택하세요 (${selected.size}개)`
                : `${selected.size}개 합치기 & 다운로드`}
            </button>
          ) : (
            <div className="archive-btn-row">
              <button className="archive-btn" onClick={() => handleDaylog(groups[groups.length - 1])}>
                오늘 데이로그
              </button>
              <button className="archive-btn" onClick={() => setSelectMode(true)}>
                선택 합치기
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button className="archive-fab" onClick={onCamera} aria-label="기록하기">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M3 10h14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* 합치기 모달 */}
      {mergeTarget && (
        <MergeModal
          clips={mergeTarget.clips}
          label={mergeTarget.label}
          onClose={() => { setMergeTarget(null); exitSelectMode() }}
        />
      )}
    </div>
  )
}
