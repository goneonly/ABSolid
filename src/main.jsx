import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './install.js' // 설치 이벤트는 페이지 로드 직후 와서 미리 받아 둠
import './index.css'
import { watchSystemTheme } from './theme.js'
import { splashStage } from './splash.js'

window.__absolidAppLoaded = true // 로딩 화면: 앱 코드를 받았으니 '오프라인으로 시작' 가능
splashStage(2)

watchSystemTheme() // '시스템' 테마일 때 휴대폰 라이트/다크 전환을 따라감

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
)
