import { Card, CheckIcon, cx } from './ui.jsx'

// 홈 화면의 연속 운동일 카드 — 소개 페이지(pages/about/screens.jsx)도 같은 카드를 씀
// celebrating: 방금 운동을 완료했을 때 숫자와 완료 표시를 한 번 튀어나오게
export default function StreakCard({ streak, doneToday, celebrating }) {
  return (
    <Card className="px-5 py-8 text-center">
      <div className="text-display font-extrabold tracking-tight tabular-nums">
        <span className={cx('inline-block text-brand', celebrating && 'motion-safe:animate-pop')}>{streak}</span>일
      </div>
      <div className="mt-2 text-sm text-dim">연속 운동 streak</div>
      <div
        className={cx(
          'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold',
          // 완료는 빨간 바탕에 흰 글자 (연한 빨강은 라이트 모드에서 연핑크로 보여서 쓰지 않음)
          doneToday ? 'bg-brand-strong text-white' : 'bg-surface-2 text-dim',
          celebrating && 'motion-safe:animate-pop',
        )}
      >
        {doneToday && <CheckIcon className="size-4" />}
        {doneToday ? (celebrating ? '오늘 운동 완료! 내일도 만나요' : '오늘 운동 완료!') : '아직 운동 전이에요'}
      </div>
    </Card>
  )
}
