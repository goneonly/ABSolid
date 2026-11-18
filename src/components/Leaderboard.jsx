import { t } from '../lib/i18n.js'
import { useEffect, useMemo, useState } from 'react'
import { todayKey } from '../lib/storage.js'
import { fetchGroupWorkoutDates } from '../server/api.js'
import { daysInRange, getPrevRange, getRange, rankRows, shortDate, withRankDelta } from '../lib/stats.js'
import RankBoard from './RankBoard.jsx'
import { Card, CardTitle, Input, Sub, cx } from './ui.jsx'

const PERIODS = [
  { key: 'week', label: t('이번 주') },
  { key: 'month', label: t('이번 달') },
  { key: '30d', label: t('최근 30일') },
  { key: 'custom', label: t('직접 설정') },
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

  // 직접 설정을 처음 누르면 최근 7일(직접 설정의 기본 기간)을 날짜 칸에 채워 둠
  // (빈 날짜 칸은 아이폰에서 아무것도 보이지 않아, 무엇을 넣는 칸인지 알기 어려움)
  function choosePeriod(key) {
    if (key === 'custom' && !cs && !ce) {
      const [a, b] = getRange('custom', '', '')
      setCs(a)
      setCe(b)
    }
    setPeriod(key)
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{t('리더보드')}</CardTitle>
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
            onClick={() => choosePeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        // 날짜 칸은 폰(특히 아이폰)이 글자 폭만큼 최소 너비를 잡아 카드 밖으로 넘치므로, 최소 너비를 없애고 두 칸이 폭을 나눠 가짐
        // 칸 폭이 17rem(272px)보다 좁으면(폭 320px 폰) 날짜가 잘리지 않게 위아래로 쌓음
        <div className="@container mt-3">
          <div className="grid grid-cols-1 gap-3 @[17rem]:grid-cols-2">
            <DateField label={t('시작일')} value={cs} max={ce || todayKey()} onChange={setCs} />
            <DateField label={t('종료일')} value={ce} min={cs} max={todayKey()} onChange={setCe} />
          </div>
        </div>
      )}

      {!rows || (loading && !cur) ? (
        <Sub className="mt-3">{t('집계 중…')}</Sub>
      ) : (
        <>
          <RankBoard rows={rows} myId={myId} myName={myName} totalDays={totalDays} />

          <Sub className="mt-3 text-xs">
            {t('기간 내 인증 횟수 기준이에요. 삼각형은 직전 {days}일 대비 순위 변동이에요.', { days: totalDays })}
          </Sub>
        </>
      )}
    </Card>
  )
}

// 날짜 칸 하나: 위에 무슨 날짜인지 이름을 붙임 (빈 칸만으로는 무엇을 넣는지 알기 어려움)
function DateField({ label, value, min, max, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-dim">{label}</span>
      <Input
        type="date"
        className="min-w-0 appearance-none px-2 py-2"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}
