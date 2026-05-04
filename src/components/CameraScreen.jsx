import { useEffect, useRef, useState, useCallback } from 'react'
import { saveClip } from '../utils/useDB'
import { formatTime } from '../utils/groupByDay'
import './CameraScreen.css'

const MAX_DURATION = 5000

export default function CameraScreen({ onClose, onSaved }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const [memo, setMemo] = useState('')
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [camReady, setCamReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setCamReady(true)
        }
      } catch (e) {
        setError('카메라 접근 권한이 필요해요')
      }
    }
    initCam()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current || recording) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = handleRecordingStop
    recorder.start(100)
    startTimeRef.current = Date.now()
    setRecording(true)
    setProgress(0)
    setElapsed(0)

    timerRef.current = setInterval(() => {
      const el = Date.now() - startTimeRef.current
      const prog = Math.min(el / MAX_DURATION, 1)
      setProgress(prog)
      setElapsed(el)
      if (el >= MAX_DURATION) stopRecording()
    }, 50)
  }, [recording])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    setRecording(false)
  }, [])

  async function handleRecordingStop() {
    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    const saved = await saveClip(blob, memo)
    setMemo('')
    setProgress(0)
    setElapsed(0)
    onSaved(saved)
  }

  const elapsedSec = (elapsed / 1000).toFixed(1)

  return (
    <div className="camera-screen">
      {error ? (
        <div className="camera-error">
          <span>{error}</span>
          <button onClick={onClose}>닫기</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="camera-preview" muted playsInline />

          {/* X 버튼 */}
          <button className="camera-close" onClick={onClose} aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* 중앙: 타임스탬프 + 메모 */}
          <div className="camera-center">
            <div className="camera-timestamp">{formatTime(now)}</div>
            <input
              className="camera-memo"
              placeholder="메모 입력..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={30}
            />
          </div>

          {/* 오른쪽: 프로그레스 + 녹화 버튼 */}
          <div className="camera-right">
            <div className="rec-progress-wrap">
              <div
                className="rec-progress-fill"
                style={{ height: `${progress * 100}%` }}
              />
            </div>
            {recording && (
              <span className="rec-elapsed">{elapsedSec}s</span>
            )}
            <button
              className={`rec-btn ${recording ? 'rec-btn--active' : ''}`}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              aria-label="녹화"
            >
              <div className={`rec-btn-inner ${recording ? 'rec-btn-inner--stop' : ''}`} />
            </button>
            {!recording && (
              <span className="rec-hint">누르고<br/>있기</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
