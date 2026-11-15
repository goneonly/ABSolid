// 5. 기능 목록 — 카드 격자. 화면에 들어오면 차례로 떠오름
import { FEATURES } from '../content.js'
import { Reveal } from '../motion.jsx'
import { SectionTitle } from './parts.jsx'

// 속을 채운 단순한 아이콘 (브랜드 빨강 한 색). 구멍은 evenodd 로 뚫음
export const ICONS = {
  camera: (
    <path d="M9 4.5 7.6 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.6L15 4.5H9Zm3 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
  ),
  bell: (
    <>
      <path d="M12 3a6 6 0 0 0-6 6v4.5L4.3 16a1 1 0 0 0 .8 1.6h13.8a1 1 0 0 0 .8-1.6L18 13.5V9a6 6 0 0 0-6-6Z" />
      <path d="M9.8 19a2.3 2.3 0 0 0 4.4 0H9.8Z" />
    </>
  ),
  bolt: <path d="M13.5 2.5 4.5 13.5H10l-1.5 8 9-11H12l1.5-8Z" />,
  phone: (
    <path d="M8.5 2A2.5 2.5 0 0 0 6 4.5v15A2.5 2.5 0 0 0 8.5 22h7a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 15.5 2h-7Zm2 16.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Z" />
  ),
  shield: (
    <path d="M12 2.5 4.5 5.5v5.7c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5Zm3.9 6.9 1.2 1.2-5.6 5.6-3.1-3.1 1.2-1.2 1.9 1.9 4.4-4.4Z" />
  ),
  sheet: (
    <path d="M6 3.5A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 18 3.5H6Zm-.5 6h4V13h-4V9.5Zm6 0h7V13h-7V9.5Zm-6 5.5h4v3.5H6a.5.5 0 0 1-.5-.5v-3Zm6 0h7v3a.5.5 0 0 1-.5.5h-6.5V15Z" />
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
              fill="currentColor"
              fillRule="evenodd"
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
