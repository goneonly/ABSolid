import { useEffect, useState } from 'react'
import {
  computeStreak,
  todayKey,
  todayWorkoutDay,
  isReminderDismissedToday,
  dismissReminderToday,
} from '../lib/storage.js'
import { fetchActiveAnnouncement, fetchReceivedCheers } from '../server/api.js'
import WeeklyReport from '../components/WeeklyReport.jsx'
import { Banner, Card, CheckIcon, CloseIcon, Page, PageTitle, Sub, cx } from '../components/ui.jsx'

const REMIND_AFTER_HOUR = 18 // 저녁 6시 이후부터 리마인더 표시

// celebrate: 방금 운동을 완료하고 돌아왔으면 true. streak 숫자와 완료 표시를 한 번 튀어나오게 (onCelebrated 로 해제)
export default function Home({ records, onStart, session, celebrate, onCelebrated }) {
  const streak = computeStreak(records)
  const doneToday = !!records[todayKey()]?.completed
  const day = todayWorkoutDay()
  const [notice, setNotice] = useState(null)
  const [cheers, setCheers] = useState([]) // 오늘 받은 응원 (회원)
  const [remindDismissed, setRemindDismissed] = useState(isReminderDismissedToday)

  useEffect(() => {
    fetchActiveAnnouncement().then(setNotice)
  }, [])

  // 축하 표시는 이 화면이 처음 열릴 때 한 번만: 부모 표시는 바로 끄고(다른 탭 다녀와도 재생 안 됨), 화면은 잠시 뒤 평소 모습으로
  const [celebrating, setCelebrating] = useState(celebrate)
  useEffect(() => {
    if (!celebrating) return
    onCelebrated()
    const t = setTimeout(() => setCelebrating(false), 3000)
    return () => clearTimeout(t)
  }, [celebrating, onCelebrated])

  useEffect(() => {
    if (!session) return
    let alive = true
    fetchReceivedCheers().then((list) => alive && setCheers(list))
    return () => {
      alive = false
    }
  }, [session])

  // 앱 내 리마인더: 저녁이 됐는데 오늘 기록이 없으면 배너 표시 (하루 1회 닫기 가능)
  const showReminder = !doneToday && !remindDismissed && new Date().getHours() >= REMIND_AFTER_HOUR

  function dismissReminder() {
    dismissReminderToday()
    setRemindDismissed(true)
  }

  return (
    <Page>
      {notice && <Banner>{notice.message}</Banner>}
      {showReminder && (
        <Banner className="flex items-center justify-between gap-3" role="alert">
          <span>오늘 아직 운동 전이에요. 자기 전에 복근 챙겨요!</span>
          <span className="flex flex-none items-center gap-1">
            <button className="hit px-2 py-1 text-sm font-bold text-brand" onClick={onStart}>
              지금 시작
            </button>
            <button
              className="hit flex items-center px-2 py-1 text-dim"
              aria-label="리마인더 닫기"
              onClick={dismissReminder}
            >
              <CloseIcon className="size-4" />
            </button>
          </span>
        </Banner>
      )}
      {cheers.length > 0 && <CheersBanner cheers={cheers} />}
      <PageTitle>오늘도 복근 챙기기</PageTitle>
      <Sub>Day {day} 운동이 준비되어 있어요.</Sub>

      <Card className="px-5 py-8 text-center">
        <div className="text-display font-extrabold tracking-tight tabular-nums">
          <span className={cx('inline-block text-brand', celebrating && 'motion-safe:animate-pop')}>{streak}</span>일
        </div>
        <div className="mt-2 text-sm text-dim">연속 운동 streak</div>
        <div
          className={cx(
            'mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold',
            doneToday ? 'bg-brand/15 text-fg [&>svg]:text-brand' : 'bg-surface-2 text-dim',
            celebrating && 'motion-safe:animate-pop',
          )}
        >
          {doneToday && <CheckIcon className="size-4" />}
          {doneToday ? (celebrating ? '오늘 운동 완료! 내일도 만나요' : '오늘 운동 완료!') : '오늘 아직 운동 전이에요'}
        </div>
      </Card>

      <WeeklyReport records={records} />
    </Page>
  )
}

// 오늘 받은 응원 — "민준, 서연 외 1명이 응원했어요"
function CheersBanner({ cheers }) {
  const names = [...new Set(cheers.map((c) => c.from_nickname))]
  const shown = names.slice(0, 2).join(', ')
  const rest = names.length - 2
  const allDone = cheers.every((c) => c.kind === 'done')
  return (
    <Banner>
      <strong>{shown}</strong>
      {rest > 0 && ` 외 ${rest}명`}님이 오늘 응원을 보냈어요
      {allDone ? '!' : '. 오늘 운동하러 가볼까요?'}
    </Banner>
  )
}
