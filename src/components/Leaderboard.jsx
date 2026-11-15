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

      <div className="mt-3 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={cx(
              'hit rounded-full border px-3 py-2 text-xs font-bold',
              period === p.key ? 'border-brand-strong bg-brand-strong text-white' : 'border-line bg-surface-2 text-dim',
            )}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="date"
            className="flex-1 px-3 py-2"
            value={cs}
            max={todayKey()}
            onChange={(e) => setCs(e.target.value)}
            aria-label="시작 날짜"
          />
          <Sub>~</Sub>
          <Input
            type="date"
            className="flex-1 px-3 py-2"
            value={ce}
            max={todayKey()}
            onChange={(e) => setCe(e.target.value)}
            aria-label="끝 날짜"
          />
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
