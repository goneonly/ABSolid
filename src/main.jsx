import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import './lib/install.js' // 설치 이벤트는 페이지 로드 직후 와서 미리 받아 둠
import './index.css'
import { forceTheme, watchSystemTheme } from './lib/theme.js'
import { splashStage } from './lib/splash.js'

// 소개 페이지는 앱과 따로 받아 옴 (앱을 여는 사람의 첫 다운로드가 늘지 않게)
const About = lazy(() => import('./pages/About.jsx'))
// 주소가 /about 이면 앱 대신 소개 페이지를 보여 줌. 이 앱의 주소는 / 와 /about 둘뿐이라 라우터를 따로 두지 않음
const isAbout = window.location.pathname.replace(/\/+$/, '') === '/about'

window.__absolidAppLoaded = true // 로딩 화면: 앱 코드를 받았으니 '오프라인으로 시작' 가능
splashStage(2)

if (isAbout) {
  document.documentElement.dataset.page = 'about' // 화면 전체 폭 사용 (index.css)
  forceTheme('dark') // 소개 페이지는 브랜드 얼굴이라 고른 테마와 상관없이 항상 다크
} else {
  watchSystemTheme() // '시스템' 테마일 때 휴대폰 라이트/다크 전환을 따라감
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAbout ? (
      <Suspense fallback={null}>
        <About />
      </Suspense>
    ) : (
      <App />
    )}
    <Analytics />
  </React.StrictMode>,
)
