import { useState } from 'react'
import CameraScreen from './components/CameraScreen'
import ArchiveScreen from './components/ArchiveScreen'

export default function App() {
  const [screen, setScreen] = useState('camera') // 앱 진입 시 카메라
  const [refresh, setRefresh] = useState(0)

  function handleSaved(clip) {
    setRefresh((n) => n + 1)
    setScreen('archive')
  }

  function goCamera() {
    setScreen('camera')
  }

  function goArchive() {
    setScreen('archive')
  }

  return (
    <>
      {screen === 'camera' && (
        <CameraScreen onClose={goArchive} onSaved={handleSaved} />
      )}
      {screen === 'archive' && (
        <ArchiveScreen onCamera={goCamera} refresh={refresh} />
      )}
    </>
  )
}
