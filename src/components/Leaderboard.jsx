import { useEffect, useMemo, useState } from 'react'
import { todayKey } from '../lib/storage.js'
import { fetchGroupWorkoutDates } from '../server/api.js'
import { daysInRange, getPrevRange, getRange, rankRows, shortDate, withRankDelta } from '../lib/stats.js'
import RankBoard from './RankBoard.jsx'
import { Card, CardTitle, Input, Sub, cx } from './ui.jsx'

const PERIODS = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: '30d', label: '최근 30일' },
  { key: 'custom', label: '직접 설정' },
]

export default function Leaderboard({ members, myId, myName, records }) {
  const [period, setPeriod] = useState('week')
  const [cs, setCs] = useState('')
  const [ce, setCe] = useState('')
  const [cur, setCur] = useState(null)
  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(false)

  const [startKey, endKey] = useMemo(() => getRange(period, cs, ce), [period, cs, ce])
  const [pStartKey, pEndKey] = useMemo(() => getPrevRange(startKey, endKey), [startKey, endKey])

  useEffect(() => {
    let alive = true
    async function run() {
      if (!members.length) return
      setLoading(true)
      const ids = members.map((m) => m.id)
      try {
        const [c, p] = await Promise.all([
          fetchGroupWorkoutDates(ids, startKey, endKey),
          fetchGroupWorkoutDates(ids, pStartKey, pEndKey),
        ])
        if (alive) {
          setCur(c)
          setPrev(p)
        }
      } catch {
        /* 네트워크 오류 시 조용히 패스 */
      }
      if (alive) setLoading(false)
    }
    run()
    return () => {
      alive = false
    }
  }, [members, startKey, endKey, pStartKey, pEndKey])

  const rows = useMemo(() => {
    if (!cur) return null
    return withRankDelta(
      rankRows(members, cur, myId, records, startKey, endKey),
      rankRows(members, prev || {}, myId, records, pStartKey, pEndKey),
    )
  }, [cur, prev, members, myId, records, startKey, endKey, pStartKey, pEndKey])

  const totalDays = daysInRange(startKey, endKey)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>리더보드</CardTitle>
        <span className="text-xs text-dim">
          {shortDate(startKey)} ~ {shortDate(endKey)}
        </span>
      </div>

      {/* 기간 버튼: 한 줄로 두고 넘치면 옆으로 밀어 넘김. 카드 안쪽 여백까지 써서 끝에서 잘려 보이게 (더 있다는 표시) */}
      <div className="-mx-6 mt-3 flex snap-x gap-2 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={cx(
              'flex-none snap-start rounded-full border px-3 py-2 text-xs font-bold whitespace-nowrap',
              period === p.key ? 'border-brand-strong bg-brand-strong text-white' : 'border-line bg-surface-2 text-dim',
            )}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        // 날짜 칸은 폰(특히 아이폰)이 글자 폭만큼 최소 너비를 잡아 카드 밖으로 넘치므로, 최소 너비를 없애고 두 칸이 폭을 나눠 가짐
        // 칸 폭이 17rem(272px)보다 좁으면(폭 320px 폰) 날짜가 잘리지 않게 위아래로 쌓음
        <div className="@container mt-3">
          <div className="grid grid-cols-1 items-center gap-2 @[17rem]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Input
              type="date"
              className="min-w-0 appearance-none px-2 py-2 text-center"
              value={cs}
              max={todayKey()}
              onChange={(e) => setCs(e.target.value)}
              aria-label="시작 날짜"
            />
            <Sub className="hidden @[17rem]:block">~</Sub>
            <Input
              type="date"
              className="min-w-0 appearance-none px-2 py-2 text-center"
              value={ce}
              max={todayKey()}
              onChange={(e) => setCe(e.target.value)}
              aria-label="끝 날짜"
            />
          </div>
        </div>
      )}

      {!rows || (loading && !cur) ? (
        <Sub className="mt-3">집계 중…</Sub>
      ) : (
        <>
          <RankBoard rows={rows} myId={myId} myName={myName} totalDays={totalDays} />

          <Sub className="mt-3 text-xs">
            기간 내 인증 횟수 기준이에요. 삼각형은 직전 {totalDays}일 대비 순위 변동이에요.
          </Sub>
        </>
      )}
    </Card>
  )
}
