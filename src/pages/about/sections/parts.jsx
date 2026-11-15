// 소개 페이지 구간들이 함께 쓰는 작은 부품
import { cx } from '../../../components/ui.jsx'

// 여러 줄 제목: ['첫 줄', '둘째 줄'] 을 줄바꿈으로 이어 줌
export function Lines({ text }) {
  return text.map((line, i) => (
    <span key={line} className="block">
      {line}
      {i < text.length - 1 && <span className="sr-only"> </span>}
    </span>
  ))
}

// 구간 제목 (큰 글자 두 줄)
export function SectionTitle({ text, className }) {
  return (
    <h2 className={cx('text-3xl font-extrabold tracking-tight', className)}>
      <Lines text={text} />
    </h2>
  )
}
