// 4. 테마 비교 — 같은 화면의 다크와 라이트를 겹쳐 두고, 가운데 선을 끌어 비교
// 아래에는 다크, 위에는 라이트 화면을 깔고, 위 화면을 선의 오른쪽만 보이게 잘라 냄
import { useRef, useState } from 'react'
import { cx } from '../../../components/ui.jsx'
import { THEME } from '../content.js'
import { Reveal } from '../motion.jsx'
import PhoneMockup from '../PhoneMockup.jsx'
import { HomeScreen } from '../screens.jsx'
import { SectionTitle } from './parts.jsx'

const PHONE_WIDTH = 'w-[min(72vw,320px)]'

export default function ThemeCompare() {
  const [split, setSplit] = useState(50) // 선의 위치 (0~100%). 선 왼쪽은 다크, 오른쪽은 라이트
  const [focused, setFocused] = useState(false)
  const boxRef = useRef(null)
  const dragging = useRef(false)

  const moveTo = (clientX) => {
    const r = boxRef.current.getBoundingClientRect()
    setSplit(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))))
  }

  return (
    <section className="mx-auto flex max-w-240 flex-col items-center gap-12 px-5 py-24 md:flex-row md:justify-center md:gap-20 md:px-10 md:py-40">
      <Reveal className="max-w-96 text-center md:text-left">
        <SectionTitle text={THEME.title} />
        <p className="mt-4 text-base text-dim">{THEME.body}</p>
      </Reveal>

      <Reveal delay={150}>
        <div
          ref={boxRef}
          className="relative cursor-ew-resize touch-pan-y select-none"
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            moveTo(e.clientX)
          }}
          onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <div aria-hidden="true">
            <PhoneMockup theme="dark" className={PHONE_WIDTH}>
              <div inert="" className="h-full">
                <HomeScreen />
              </div>
            </PhoneMockup>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
              <PhoneMockup theme="light" className={PHONE_WIDTH}>
                <div inert="" className="h-full">
                  <HomeScreen />
                </div>
              </PhoneMockup>
            </div>

            {/* 가운데 선과 손잡이 */}
            <div
              className="pointer-events-none absolute inset-y-4 w-0.5 -translate-x-1/2 bg-fg"
              style={{ left: `${split}%` }}
            >
              <span
                className={cx(
                  'absolute top-1/2 left-1/2 flex size-11 -translate-1/2 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-float',
                  focused && 'outline-2 outline-offset-2 outline-brand',
                )}
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 7 4 12l5 5" />
                  <path d="m15 7 5 5-5 5" />
                </svg>
              </span>
            </div>
          </div>

          {/* 키보드와 화면 낭독기용 조절 막대 (보이지 않음). 좌우 화살표로 선을 옮김 */}
          <input
            type="range"
            className="sr-only"
            min="0"
            max="100"
            step="5"
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="다크와 라이트 화면 비교"
            aria-valuetext={`다크 ${split}%, 라이트 ${100 - split}%`}
          />
        </div>
        <div className="mt-4 flex justify-between px-4 text-xs font-bold text-dim" aria-hidden="true">
          <span>{THEME.dark}</span>
          <span>{THEME.light}</span>
        </div>
      </Reveal>
    </section>
  )
}
