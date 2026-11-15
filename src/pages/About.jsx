// 소개 페이지 (/about) — ABSolid 가 어떤 앱인지 보여 주는 공개 페이지
// 이 파일은 구간의 순서만 정함. 구간은 about/sections/, 문구는 about/content.js,
// 휴대폰 속 화면은 about/screens.jsx (앱의 실제 부품을 가짜 데이터로 그림), 움직임은 about/motion.jsx 와 about.css
// 브랜드 얼굴이라 사용자가 고른 테마와 상관없이 항상 다크로 보여 줌 (main.jsx)
import { useEffect } from 'react'
import { Logo, MiniButton } from '../components/ui.jsx'
import { hideSplash } from '../lib/splash.js'
import './about/about.css'
import { LINKS } from './about/content.js'
import { useScrollProgress } from './about/motion.jsx'
import { PHONE_RATIO } from './about/PhoneMockup.jsx'
import Cta from './about/sections/Cta.jsx'
import Features from './about/sections/Features.jsx'
import Hero from './about/sections/Hero.jsx'
import Numbers from './about/sections/Numbers.jsx'
import Showcase from './about/sections/Showcase.jsx'
import ThemeCompare from './about/sections/ThemeCompare.jsx'

const TITLE = 'ABSolid 소개 — 10분의 꾸준함이 만드는 단단함'

export default function About() {
  const pageRef = useScrollProgress('pin') // 페이지를 내려간 비율 (맨 위 진행 막대)

  useEffect(() => {
    document.title = TITLE
    hideSplash(600) // 로딩 화면은 로고가 그려질 만큼만 짧게
  }, [])

  return (
    <div ref={pageRef} className="overflow-x-clip" style={{ '--phone-ratio': PHONE_RATIO }}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-240 items-center justify-between px-5 md:px-10">
          <a href="/about" aria-label="ABSolid 소개 맨 위로">
            <Logo className="text-xl" />
          </a>
          <MiniButton as="a" href={LINKS.app} className="hit">
            앱 열기
          </MiniButton>
        </div>
        <i className="about-progress absolute inset-x-0 bottom-0 block h-0.5 bg-brand" aria-hidden="true" />
      </header>

      <main>
        <Hero />
        <Showcase />
        <Numbers />
        <ThemeCompare />
        <Features />
        <Cta />
      </main>

      <footer className="border-t border-line px-5 py-8 text-center text-xs text-dim">
        <p>ABSolid v{__APP_VERSION__}</p>
        <p className="mt-2 flex justify-center gap-5">
          <a className="hit hover:text-fg hover:underline" href={LINKS.app}>
            앱 열기
          </a>
          <a className="hit hover:text-fg hover:underline" href={LINKS.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}
