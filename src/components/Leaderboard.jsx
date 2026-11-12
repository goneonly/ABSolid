import { useEffect, useMemo, useState } from 'react'
import { todayKey } from '../lib/storage.js'
import { fetchGroupWorkoutDates } from '../server/api.js'
import { daysInRange, getPrevRange, getRange, rankRows, shortDate, withRankDelta } from '../lib/stats.js'
import { Card, CardTitle, Input, MemberAvatar, Sub, Trend, cx } from './ui.jsx'

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
  }, [members, myId, startKey, endKey, pStartKey, pEndKey])

  const rows = useMemo(() => {
    if (!cur) return null
    return withRankDelta(
      rankRows(members, cur, myId, records, startKey, endKey),
      rankRows(members, prev || {}, myId, records, pStartKey, pEndKey),
    )
  }, [cur, prev, members, myId, records, startKey, endKey, pStartKey, pEndKey])

  const totalDays = daysInRange(startKey, endKey)
  const me = rows?.find((r) => r.id === myId)

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
              period === p.key ? 'border-brand bg-brand/15 text-fg' : 'border-line bg-surface-2 text-dim',
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
          {me && (
            <div className="mt-3 rounded-md border border-line px-4 py-3 text-sm">
              내 순위 <strong className="text-base text-brand">{me.rank}위</strong> · 인증 {me.count}회
              <Trend delta={me.delta} className="ml-2 text-xs" />
            </div>
          )}

          <div className="mt-1">
            {rows.map((r) => {
              const medal = r.rank <= 3 && r.count > 0
              return (
                <div key={r.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <span
                    className={cx(
                      'w-6 flex-none text-center font-extrabold',
                      medal ? 'text-base text-brand' : 'text-sm text-dim',
                    )}
                  >
                    {r.rank}
                  </span>
                  <MemberAvatar name={r.name} avatar={r.avatar} active={r.rank === 1 && r.count > 0} />
                  <div className="min-w-0 flex-1">
                    <span className={cx('text-sm font-bold', r.id === myId && 'text-brand')}>
                      {r.id === myId ? myName || r.name : r.name}
                      {r.id === myId ? ' (나)' : ''}
                    </span>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <i
                        className="block h-full rounded-full bg-brand transition-[width] duration-300"
                        style={{ width: `${Math.min(100, (r.count / totalDays) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 flex-none text-right text-xs">
                    {r.delta ? <Trend delta={r.delta} /> : <span className="text-dot">—</span>}
                  </span>
                  <span className="w-10 flex-none text-right text-sm font-extrabold">
                    {r.count}
                    <span className="ml-px text-xs font-normal text-dim">회</span>
                  </span>
                </div>
              )
            })}
          </div>

          <Sub className="mt-3 text-xs">
            기간 내 인증 횟수 기준이에요. 삼각형은 직전 {totalDays}일 대비 순위 변동이에요.
          </Sub>
        </>
      )}
    </Card>
  )
}
