// 2. 기능 소개 — 휴대폰을 화면에 고정해 두고, 스크롤하는 동안 설명과 휴대폰 속 화면이 한 단계씩 바뀜
// 단계 수만큼 긴 구간(단계마다 화면 한 장 높이)을 만들고, 그 안에서 지나온 비율로 지금 단계를 정함
import { useState } from 'react'
import { cx } from '../../../components/ui.jsx'
import { SHOWCASE } from '../content.js'
import { reduceMotion, useScrollProgress } from '../motion.jsx'
import PhoneMockup from '../PhoneMockup.jsx'
import { CompleteScreen, GroupScreen, HomeScreen, LeaderboardScreen } from '../screens.jsx'
import { Lines } from './parts.jsx'

// content.js 의 screen 이름과 실제 화면을 잇는 표. interactive: 화면 속 버튼을 눌러 볼 수 있는 화면
export const SCREENS = {
  home: { render: () => <HomeScreen /> },
  complete: { render: (active) => <CompleteScreen active={active} /> },
  group: { render: () => <GroupScreen />, interactive: true },
  rank: { render: () => <LeaderboardScreen /> },
}

const STEPS = SHOWCASE.length

export default function Showcase() {
  const [active, setActive] = useState(0)
  const ref = useScrollProgress('pin', (p) => setActive(Math.min(STEPS - 1, Math.floor(p * STEPS))))

  // 단계 점을 누르면 그 단계의 가운데로 스크롤
  function goTo(index) {
    const el = ref.current
    if (!el) return
    const start = el.getBoundingClientRect().top + window.scrollY
    const span = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: start + (span * (index + 0.5)) / STEPS, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }

  return (
    <section
      ref={ref}
      className="relative mt-24 md:mt-40"
      style={{ height: `${STEPS * 100}svh` }}
      aria-label="주요 기능"
    >
      <div className="sticky top-0 flex h-svh flex-col items-center gap-6 overflow-hidden px-5 pt-[calc(4rem+env(safe-area-inset-top))] pb-6 md:flex-row md:justify-center md:gap-20 md:px-10 md:pt-14 md:pb-0">
        {/* 휴대폰: 좁은 화면에서는 위, 넓은 화면에서는 오른쪽 */}
        <div className="flex min-h-0 flex-1 items-center justify-center md:order-2 md:flex-none">
          <div className="about-showcase-phone">
            <PhoneMockup className="w-[min(60vw,calc(min(50svh,100svh_-_330px)*var(--phone-ratio)))] md:w-[calc(78svh*var(--phone-ratio))]">
              {SHOWCASE.map((step, i) => {
                const screen = SCREENS[step.screen]
                const shown = i === active
                const usable = shown && screen.interactive
                return (
                  <div
                    key={step.key}
                    className={cx(
                      'absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none',
                      shown ? 'opacity-100' : 'opacity-0',
                    )}
                    // 보이지 않는 화면과 눌러 볼 수 없는 화면은 키보드와 화면 낭독기가 건너뜀
                    inert={usable ? undefined : ''}
                    aria-hidden={usable ? undefined : true}
                    role={usable ? 'group' : undefined}
                    aria-label={usable ? `${step.label} 화면 예시` : undefined}
                  >
                    {screen.render(shown)}
                  </div>
                )
              })}
            </PhoneMockup>
          </div>
        </div>

        {/* 설명: 단계마다 같은 자리에 겹쳐 두고 지금 단계만 보이게 */}
        <div className="w-full max-w-120 flex-none md:order-1 md:w-96">
          <div className="relative h-44 md:h-72">
            {SHOWCASE.map((step, i) => (
              <div
                key={step.key}
                className={cx(
                  'absolute inset-0 flex flex-col justify-center transition-[opacity,transform] duration-500 motion-reduce:transition-none',
                  i === active ? 'opacity-100' : 'pointer-events-none opacity-0',
                  i > active && 'translate-y-6 motion-reduce:translate-y-0',
                  i < active && '-translate-y-6 motion-reduce:translate-y-0',
                )}
              >
                <p className="text-xs font-bold text-brand tabular-nums">
                  {String(i + 1).padStart(2, '0')} {step.label}
                </p>
                <h3 className="mt-2 text-xl font-extrabold tracking-tight md:mt-3 md:text-3xl">
                  <Lines text={step.title} />
                </h3>
                <p className="mt-2 text-sm text-dim md:mt-4 md:text-base">{step.body}</p>
                {/* 좁은 화면에서는 휴대폰이 작아 버튼을 누르기 어려우므로 넓은 화면에서만 안내 */}
                {step.hint && <p className="mt-3 hidden text-sm font-bold text-fg md:block">{step.hint}</p>}
              </div>
            ))}
          </div>

          {/* 단계 점: 지금 단계는 길고 빨갛게 (로딩 화면의 단계 막대와 같은 모양). 누르면 그 단계로 이동 */}
          <div className="mt-4 flex gap-2 md:mt-8" role="tablist" aria-label="기능 단계">
            {SHOWCASE.map((step, i) => (
              <button
                key={step.key}
                role="tab"
                aria-selected={i === active}
                aria-label={`${i + 1}번째: ${step.label}`}
                className="hit flex h-6 items-center"
                onClick={() => goTo(i)}
              >
                <i
                  className={cx(
                    'block h-1.5 rounded-full transition-[width,background-color] duration-300',
                    i === active ? 'w-8 bg-brand' : 'w-3 bg-dot',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
