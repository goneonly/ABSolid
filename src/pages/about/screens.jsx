// 소개 페이지의 휴대폰 안에 보여 주는 화면 예시
// 캡처 사진이 아니라 앱의 실제 부품(StreakCard, WeeklyReport, MemberRow, RankBoard, CompleteModal, BottomNav)을
// 가짜 데이터로 그린 것이라, 부품의 모양이 바뀌면 여기도 저절로 따라 바뀜.
// 화면의 구성(어떤 부품을 어떤 순서로 놓는지)이 바뀌면 이 파일만 고치면 됨
import { t } from '../../lib/i18n.js'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav.jsx'
import CompleteModal from '../../components/CompleteModal.jsx'
import RankBoard from '../../components/RankBoard.jsx'
import StreakCard from '../../components/StreakCard.jsx'
import WeeklyReport from '../../components/WeeklyReport.jsx'
import { Card, CardTitle, GroupPhoto, Logo, Page, PageTitle, Sub } from '../../components/ui.jsx'
import { computeStreak, todayWorkoutDay } from '../../lib/storage.js'
import MemberRow from '../group/MemberRow.jsx'
import { DEMO_GROUP, DEMO_ME, DEMO_STREAK, demoMembers, demoRanking, demoRecords } from './demoData.js'

const noop = () => {}

// 아이폰 상태표시줄 (시각, 신호, 와이파이, 배터리). 가운데는 틀 이미지의 카메라 자리
function StatusBar() {
  return (
    <div className="flex h-14 items-center justify-between px-8 pt-2 text-sm font-bold" aria-hidden="true">
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1">
        <svg className="h-3 w-4" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5" width="3" height="7" rx="1" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg
          className="size-4"
          viewBox="0 0 16 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M1.5 4.5a9.5 9.5 0 0 1 13 0" />
          <path d="M4 7.3a6 6 0 0 1 8 0" />
          <path d="M6.6 10a2.2 2.2 0 0 1 2.8 0" />
        </svg>
        <svg className="h-3 w-6" viewBox="0 0 26 12" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="21.5"
            height="10.5"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <rect x="2.5" y="2.5" width="15" height="7" rx="1.5" fill="currentColor" />
          <rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}

// 앱의 공통 틀: 로고 머리줄 + 화면 + 아래 메뉴 (App.jsx 의 배치와 같게)
function AppShell({ view = 'home', children }) {
  return (
    <div className="flex h-full flex-col bg-bg">
      <StatusBar />
      <header className="flex items-center justify-between px-5 pt-2 pb-3">
        <Logo className="text-xl" />
        <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-bold text-dim">{t('로그인됨')}</span>
      </header>
      {children}
      <BottomNav view={view} onChange={noop} />
    </div>
  )
}

// 홈: 연속 운동일과 주간 리포트. celebrating 이면 숫자가 한 번 튀어나옴
export function HomeScreen({ doneToday = true, celebrating = false }) {
  const records = demoRecords({ doneToday })
  return (
    <AppShell view="home">
      <Page as="div">
        <PageTitle>{t('오늘도 복근 챙기기')}</PageTitle>
        <Sub>{t('Day {day} 운동이 준비되어 있어요.', { day: todayWorkoutDay() })}</Sub>
        <StreakCard streak={computeStreak(records)} doneToday={doneToday} celebrating={celebrating} />
        <WeeklyReport records={records} />
      </Page>
    </AppShell>
  )
}

// 운동 완료: 영상을 다 본 직후 뜨는 완료 창. active 일 때만 창을 띄워, 이 단계로 올 때마다 창이 올라오는 움직임이 다시 보임
export function CompleteScreen({ active = true }) {
  const records = demoRecords({ doneToday: false })
  return (
    <AppShell view="workout">
      <Page as="div">
        <PageTitle>{t('Day {day} 복근 운동', { day: todayWorkoutDay() })}</PageTitle>
        <Sub>{t('영상이 끝나면 자동으로 운동 완료 처리돼요.')}</Sub>
        <StreakCard streak={computeStreak(records)} doneToday={false} />
      </Page>
      {active && (
        <CompleteModal
          day={todayWorkoutDay()}
          streak={{ from: DEMO_STREAK - 1, to: DEMO_STREAK }}
          busy={false}
          onSave={noop}
          onSkip={noop}
        />
      )}
    </AppShell>
  )
}

// 그룹 화면 맨 위의 그룹 정보 카드 (이름, 멤버 수, 초대 코드)
function GroupHeader({ memberCount }) {
  return (
    <Card className="mt-2">
      <div className="flex items-center gap-4">
        <GroupPhoto name={DEMO_GROUP.name} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold tracking-tight">{DEMO_GROUP.name}</h2>
          <div className="mt-1 text-xs text-dim">
            {t('멤버 {count}/{max}명', { count: memberCount, max: DEMO_GROUP.max_members })}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-surface-2 px-4 py-3 text-xs text-dim">
        {t('초대 코드')} <strong className="ml-1 tracking-wider text-fg">{DEMO_GROUP.invite_code}</strong>
      </div>
    </Card>
  )
}

// 그룹: 멤버 현황과 응원. 응원 버튼은 실제로 눌러 볼 수 있음 (서버에 보내지 않고 이 화면에서만 바뀜)
export function GroupScreen() {
  const [members] = useState(demoMembers)
  const [cheers, setCheers] = useState({ counts: { [DEMO_ME]: 2, m1: 1 }, byMe: new Set() })

  const cheerFor = (id) =>
    setCheers((prev) => ({
      counts: { ...prev.counts, [id]: (prev.counts[id] || 0) + 1 },
      byMe: new Set([...prev.byMe, id]),
    }))

  return (
    <AppShell view="group">
      <Page as="div">
        <GroupHeader memberCount={members.length} />
        <Card>
          <CardTitle>{t('멤버 현황')}</CardTitle>
          <div className="mt-2">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                name={m.name}
                isMe={m.id === DEMO_ME}
                avatar={m.avatar}
                dates={m.dates}
                cheer={{
                  count: cheers.counts[m.id] || 0,
                  sent: cheers.byMe.has(m.id),
                  busy: false,
                  onCheer: () => cheerFor(m.id),
                }}
              />
            ))}
          </div>
        </Card>
      </Page>
    </AppShell>
  )
}

// 리더보드: 최근 7일 순위
export function LeaderboardScreen() {
  const [{ rows, totalDays }] = useState(demoRanking)
  return (
    <AppShell view="group">
      <Page as="div">
        <GroupHeader memberCount={rows.length} />
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>{t('리더보드')}</CardTitle>
            <span className="text-xs text-dim">{t('최근 7일')}</span>
          </div>
          <RankBoard rows={rows} myId={DEMO_ME} totalDays={totalDays} />
          <Sub className="mt-3 text-xs">
            {t('기간 내 인증 횟수 기준이에요. 삼각형은 직전 {days}일 대비 순위 변동이에요.', { days: totalDays })}
          </Sub>
        </Card>
      </Page>
    </AppShell>
  )
}
