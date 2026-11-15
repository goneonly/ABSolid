// 개발용: Hono 앱을 내 컴퓨터의 Node 서버로 실행 (배포에서는 쓰지 않음)
// npm run dev 가 화면 개발 서버(5173)와 함께 띄우고, 화면 쪽 /api 요청은 vite.config.js 의 proxy 가 이리로 넘겨줌
import { serve } from '@hono/node-server'
import app from './app.js'

const port = Number(process.env.API_PORT) || 8787

serve({ fetch: app.fetch, port }, () => {
  console.log(`API 서버: http://localhost:${port}/api/health`)
})
