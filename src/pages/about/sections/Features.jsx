// 5. 기능 목록 — 카드 격자. 화면에 들어오면 차례로 떠오름
import { FEATURES } from '../content.js'
import { Reveal } from '../motion.jsx'
import { SectionTitle } from './parts.jsx'

// 선으로 그린 단순한 아이콘 (브랜드 빨강 선)
export const ICONS = {
  camera: (
    <>
      <path d="M8.5 7 10 4.5h4L15.5 7" />
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.9 7 9.3 4.1-1.4 7-5 7-9.3V5.8L12 3Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </>
  ),
  sheet: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M4 15h16M10 4v16" />
    </>
  ),
}

export default function Features() {
  return (
    <section className="mx-auto max-w-240 px-5 py-24 md:px-10 md:py-40">
      <Reveal className="text-center">
        <SectionTitle text={FEATURES.title} />
      </Reveal>
      <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {FEATURES.items.map((item, i) => (
          <Reveal
            key={item.title}
            delay={(i % 3) * 120}
            className="rounded-xl border border-line bg-surface p-6 hover:border-dot motion-safe:hover:-translate-y-1"
          >
            <svg
              className="size-8 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {ICONS[item.icon]}
            </svg>
            <h3 className="mt-6 text-base font-bold">{item.title}</h3>
            <p className="mt-2 text-sm text-dim">{item.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
