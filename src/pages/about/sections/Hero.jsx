// 1. 첫 화면 — 큰 제목과 시작 버튼, 그 아래 누워 있다가 스크롤하면 일어서는 휴대폰
import { Button } from '../../../components/ui.jsx'
import { HERO, LINKS } from '../content.js'
import { Reveal, useScrollProgress, useTilt } from '../motion.jsx'
import PhoneMockup from '../PhoneMockup.jsx'
import { HomeScreen } from '../screens.jsx'
import { Lines } from './parts.jsx'

export default function Hero() {
  const tiltRef = useTilt() // 마우스 위치 (구간 전체에서 받아 휴대폰까지 내려감)
  const phoneRef = useScrollProgress('enter')
  return (
    <section ref={tiltRef} className="px-5 pt-[calc(7rem+env(safe-area-inset-top))] text-center md:pt-32">
      <Reveal eager as="p" className="text-sm font-bold text-brand">
        {HERO.eyebrow}
      </Reveal>
      <Reveal eager as="h1" delay={100} className="mt-4 text-3xl font-extrabold tracking-tight md:text-display">
        <Lines text={HERO.title} />
      </Reveal>
      <Reveal eager as="p" delay={200} className="mx-auto mt-6 max-w-120 text-base text-dim">
        {HERO.body}
      </Reveal>
      <Reveal eager delay={300} className="mt-8 flex flex-col items-center gap-3">
        <Button as="a" href={LINKS.app} className="w-auto px-8">
          {HERO.cta}
        </Button>
        <span className="text-sm text-dim">{HERO.note}</span>
      </Reveal>

      {/* 바깥 칸으로 스크롤 위치를 재고(기울어지기 전 자리 기준), 안쪽 칸을 기울임 */}
      <div ref={phoneRef} className="mx-auto mt-12 w-[min(72vw,340px)]" aria-hidden="true">
        <div className="about-hero-phone">
          <PhoneMockup className="w-full">
            <div inert="" className="h-full">
              <HomeScreen celebrating />
            </div>
          </PhoneMockup>
        </div>
      </div>
    </section>
  )
}
