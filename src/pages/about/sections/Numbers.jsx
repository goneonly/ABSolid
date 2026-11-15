// 3. 숫자 — 화면에 들어오면 0 에서 올라가는 큰 숫자 세 개
import { NUMBERS } from '../content.js'
import { CountUp, Reveal } from '../motion.jsx'
import { SectionTitle } from './parts.jsx'

export default function Numbers() {
  return (
    <section className="mx-auto max-w-240 px-5 py-24 text-center md:px-10 md:py-40">
      <Reveal>
        <SectionTitle text={NUMBERS.title} />
      </Reveal>
      <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-6">
        {NUMBERS.items.map((item, i) => (
          <Reveal key={item.label} delay={i * 120} className="rounded-xl border border-line bg-surface px-6 py-10">
            <div className="text-display font-extrabold tracking-tight">
              <CountUp to={item.value} />
              <span className="ml-1 text-3xl text-brand">{item.unit}</span>
            </div>
            <p className="mt-4 text-sm text-dim">{item.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
