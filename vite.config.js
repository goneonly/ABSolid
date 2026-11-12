import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // package.json의 version을 앱 전역 상수로 주입 → 설정 화면에 자동 표시
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // 라이브러리(React·Supabase)는 따로 묶음: 앱 코드만 바뀐 배포에서는 이 파일을 브라우저 캐시에서 그대로 씀
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
        },
      },
    },
  },
  // 단위 테스트(Vitest) — 날짜 계산은 사용자 기기와 같은 한국 시간으로 재현
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
    env: { TZ: 'Asia/Seoul' },
  },
})
