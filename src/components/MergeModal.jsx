import { useEffect, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import './MergeModal.css'

export default function MergeModal({ clips, label, onClose }) {
  const ffmpegRef = useRef(null)
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function startMerge() {
    try {
      setPhase('loading')
      setProgress(0)

      const ffmpeg = new FFmpeg()
      ffmpegRef.current = ffmpeg
      ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)))

      // public/ffmpeg/ 에서 직접 로드
      await ffmpeg.load({
        coreURL: '/ffmpeg/ffmpeg-core.js',
        wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      })

      setPhase('merging')
      setProgress(0)

      // 각 클립을 가상 파일시스템에 쓰기
      const fileList = []
      for (let i = 0; i < clips.length; i++) {
        const name = `clip${i}.webm`
        await ffmpeg.writeFile(name, await fetchFile(clips[i].blob))
        fileList.push(name)
      }

      // concat list 생성
      const concatContent = fileList.map((f) => `file '${f}'`).join('\n')
      await ffmpeg.writeFile('list.txt', new TextEncoder().encode(concatContent))

      // mp4로 변환
      await ffmpeg.exec([
        '-f', 'concat', '-safe', '0', '-i', 'list.txt',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        'output.mp4',
      ])

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
              {phase === 'loading' ? 'FFmpeg 로딩 중...' : `변환 중 ${progress}%`}
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
