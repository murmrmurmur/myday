import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../utils/groupByDay'
import './ClipCard.css'

export default function ClipCard({ clip, selected, selectable, onSelect }) {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    const objUrl = URL.createObjectURL(clip.blob)
    setUrl(objUrl)
    return () => URL.revokeObjectURL(objUrl)
  }, [clip.blob])

  useEffect(() => {
    if (!url || !wrapRef.current) return
    const el = wrapRef.current
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          videoRef.current.play().catch(() => {})
        } else {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
      },
      { threshold: 0.6 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [url])

  return (
    <div
      ref={wrapRef}
      className={`clip-card ${selected ? 'clip-card--selected' : ''} ${selectable ? 'clip-card--selectable' : ''}`}
      onClick={selectable ? onSelect : undefined}
    >
      {url && (
        <video
          ref={videoRef}
          className="clip-video"
          src={url}
          loop
          muted
          playsInline
        />
      )}

      {/* 타임스탬프 + 메모 오버레이 (중앙) */}
      <div className="clip-overlay">
        <span className="clip-time">{formatTime(clip.timestamp)}</span>
        {clip.memo && <span className="clip-memo">{clip.memo}</span>}
      </div>

      {/* 선택 체크 */}
      {selectable && (
        <div className={`clip-check ${selected ? 'clip-check--on' : ''}`}>
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}
    </div>
  )
}
