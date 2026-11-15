// 6. 마무리 — 마지막 인상: 한 번 더 시작 버튼
import { Button } from '../../../components/ui.jsx'
import { CTA, LINKS } from '../content.js'
import { Reveal } from '../motion.jsx'
import { SectionTitle } from './parts.jsx'

export default function Cta() {
  return (
    <section className="px-5 py-24 text-center md:py-40">
      <Reveal>
        <SectionTitle text={CTA.title} />
      </Reveal>
      <Reveal as="p" delay={100} className="mt-4 text-base text-dim">
        {CTA.body}
      </Reveal>
      <Reveal delay={200} className="mt-8">
        <Button as="a" href={LINKS.app} className="inline-block w-auto px-8">
          {CTA.cta}
        </Button>
      </Reveal>
    </section>
  )
}
