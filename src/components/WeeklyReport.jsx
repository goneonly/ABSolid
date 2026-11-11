import { useMemo } from 'react'
import { weeklySummary } from '../stats.js'
import { Card, CardTitle, CheckIcon, Sub, Trend, cx } from './ui.jsx'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// 이번 주(월~일) 인증 요약 + 지난주 대비 + 최근 7일 현황
export default function WeeklyReport({ records }) {
  const data = useMemo(() => weeklySummary(records), [records])

  const { count, lastCount, delta, rate, streak, recent, range } = data

  const message =
    count === 0
      ? '이번 주 첫 운동을 시작해 볼까요?'
      : delta > 0
        ? '지난주보다 더 활발해요! 이 기세 그대로 가요.'
        : delta < 0
          ? '지난주엔 더 열심이었어요. 오늘 한 번 어때요?'
          : '지난주와 같은 페이스로 꾸준해요.'

  return (
    <Card>
      <CardTitle>주간 리포트</CardTitle>
      <Sub className="mt-1 text-xs">이번 주 · {range}</Sub>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={count} unit="회" label="이번 주 인증" />
        <Stat value={streak} unit="일" label="연속 streak" />
        <Stat value={rate} unit="%" label="이번 주 달성률" />
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <i
          className="block h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>

      <Sub className="mt-3">
        지난주 {lastCount}회
        <Trend delta={delta} className="ml-2 text-xs" /> · {message}
      </Sub>

      <div className="mt-5 border-t border-line pt-4">
        <Sub className="mb-3">최근 7일</Sub>
        <div className="flex justify-between">
          {recent.map((d, i) => (
            <div className="flex flex-col items-center gap-2 text-xs text-dim" key={d.key}>
              <div
                className={cx(
                  'flex size-8 items-center justify-center rounded-full text-sm tabular-nums',
                  d.done ? 'bg-brand text-white' : 'bg-surface-2 text-dim',
                  i === 6 && 'outline-2 outline-offset-2 outline-brand',
                )}
              >
                {d.done ? <CheckIcon className="size-4" /> : d.date.getDate()}
              </div>
              {DOW[d.date.getDay()]}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function Stat({ value, unit, label }) {
  return (
    <div className="rounded-md border border-line bg-surface-2 px-2 py-3 text-center text-xs text-dim">
      <b className="mb-1 block text-xl font-extrabold text-fg">
        {value}
        <span className="ml-px text-xs font-bold text-dim">{unit}</span>
      </b>
      {label}
    </div>
  )
}
