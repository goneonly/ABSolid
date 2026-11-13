// Vercel 서버 함수 입구 — 배포에서 /api 로 오는 모든 요청을 Hono 앱에 넘김
// (vercel.json 의 rewrites 가 /api/아무주소 를 이 파일로 보내고, 원래 주소는 그대로 유지돼 Hono 가 길을 찾음)
// 실제 코드는 server/app.js 에 있음. 이 파일은 연결만 담당
import { handle } from 'hono/vercel'
import app from '../server/app.js'

const handler = handle(app)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
