import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// COOP/COEP 헤더를 Service Worker로 주입하는 플러그인
// coi-serviceworker: Cross-Origin Isolation without server headers
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'coi-serviceworker',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>\n    <script src="/coi-serviceworker.js"></script>`
        )
      },
    },
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
