import { useEffect, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import './MergeModal.css'

export default function MergeModal({ clips, label, onClose }) {
  const ffmpegRef = useRef(null)
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function startMerge() {
    try {
      setPhase('loading')
      setProgress(0)

      const ffmpeg = new FFmpeg()
      ffmpegRef.current = ffmpeg
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))

      const base = `${window.location.origin}/ffmpeg`
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })

      setPhase('merging')
      setProgress(0)

      // 1단계: WebM → MP4 개별 변환
      // WebM(MediaRecorder)은 seek table/duration 없어 filter_complex가 hang → 하나씩 처리
      // -r 30: VFR → CFR 변환 (VFR 유지 시 concat에서 재생속도 오류)
      // -ar/-ac: 오디오 포맷 통일 (클립 간 samplerate/채널 불일치 방지)
      // -avoid_negative_ts: 첫 PTS가 음수면 이후 타임스탬프 오프셋 누적 방지
      for (let i = 0; i < clips.length; i++) {
        setStepLabel(`${i + 1}/${clips.length} 변환 중`)
        setProgress(Math.round((i / clips.length) * 80))
        await ffmpeg.writeFile(`clip${i}.webm`, await fetchFile(clips[i].blob))
        await ffmpeg.exec([
          '-avoid_negative_ts', 'make_zero',
          '-i', `clip${i}.webm`,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
          '-r', '30',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-ar', '44100', '-ac', '2',
          `clip${i}.mp4`,
        ])
        await ffmpeg.deleteFile(`clip${i}.webm`)
      }

      // 2단계: MP4 → filter_complex concat → 최종 MP4
      // MP4는 seek table/duration 있어 filter_complex hang 없음
      // -c copy 대신 재인코딩: 클립 간 타임스탬프 오프셋을 완전히 정규화
      setStepLabel('합치는 중')
      setProgress(85)
      const n = clips.length
      const inputArgs = Array.from({ length: n }, (_, i) => ['-i', `clip${i}.mp4`]).flat()
      const filterInputs = Array.from({ length: n }, (_, i) => `[${i}:v][${i}:a]`).join('')

      await ffmpeg.exec([
        ...inputArgs,
        '-filter_complex', `${filterInputs}concat=n=${n}:v=1:a=1[v][a]`,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        'output.mp4',
      ])

      for (let i = 0; i < n; i++) await ffmpeg.deleteFile(`clip${i}.mp4`)
      setProgress(100)

      const data = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([data.buffer], { type: 'video/mp4' })
      setDownloadUrl(URL.createObjectURL(blob))
      setPhase('done')
    } catch (e) {
      console.error(e)
      setErrorMsg(e.message || '오류가 발생했어요')
      setPhase('error')
    }
  }

  function handleDownload() {
    const a = document.createElement('a')
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    a.href = downloadUrl
    a.download = `myday_${stamp}.mp4`
    a.click()
  }

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl) }
  }, [downloadUrl])

  return (
    <div className="merge-backdrop">
      <div className="merge-modal">
        <div className="merge-header">
          <span className="merge-title">{label}</span>
          <span className="merge-sub">{clips.length}개 클립</span>
        </div>

        {phase === 'idle' && (
          <>
            <p className="merge-desc">
              영상을 시간순으로 합쳐 MP4로 저장해요.
            </p>
            <div className="merge-btns">
              <button className="merge-cancel" onClick={onClose}>취소</button>
              <button className="merge-start" onClick={startMerge}>합치기 시작</button>
            </div>
          </>
        )}

        {(phase === 'loading' || phase === 'merging') && (
          <div className="merge-progress-area">
            <div className="merge-status">
              {phase === 'loading' ? 'FFmpeg 로딩 중...' : `${stepLabel} ${progress}%`}
            </div>
            <div className="merge-bar">
              <div className="merge-bar-fill"
                style={{ width: phase === 'loading' ? '10%' : `${Math.max(progress, 5)}%` }} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <>
            <p className="merge-desc merge-desc--done">완성됐어요!</p>
            <div className="merge-btns">
              <button className="merge-cancel" onClick={onClose}>닫기</button>
              <button className="merge-start" onClick={handleDownload}>MP4 다운로드</button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <p className="merge-desc merge-desc--error">{errorMsg}</p>
            <div className="merge-btns">
              <button className="merge-cancel" onClick={onClose}>닫기</button>
              <button className="merge-start" onClick={startMerge}>다시 시도</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
