// 그룹 탭: 내 그룹 목록 → 그룹을 누르면 상세 화면 (비회원에게는 로그인 안내)
import { useEffect, useState, useCallback } from 'react'
import { lastNDays, getProfile } from '../storage.js'
import { supabase } from '../supabase.js'
import { fetchMyGroups } from '../api.js'
import { Button, Card, GroupPhoto, Page, PageTitle, Sub } from '../components/ui.jsx'
import MemberRow from './group/MemberRow.jsx'
import JoinCreateCard from './group/JoinCreateCard.jsx'
import GroupDetail from './group/GroupDetail.jsx'

export default function Group({ records, session }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const loadGroups = useCallback(async () => {
    if (!supabase || !session) {
      setLoading(false)
      return []
    }
    setLoading(true)
    setLoadError('')
    try {
      const list = await fetchMyGroups()
      setGroups(list)
      return list
    } catch (e) {
      setLoadError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // 나(내 기록)는 항상 로컬 기록 기준으로도 표시
  const myDates = new Set(
    lastNDays(7, records)
      .filter((d) => d.done)
      .map((d) => d.key),
  )
  const myNick = getProfile().nickname // 비어 있으면 서버 닉네임을 그대로 사용
  const myName = myNick || '나'
  const myId = session?.user?.id

  // ── 미로그인/서버 미연결 ──
  if (!supabase || !session) {
    return (
      <Page>
        <PageTitle>그룹</PageTitle>
        <Card>
          <MemberRow name={myName} isMe dates={myDates} />
        </Card>
        <Card className="relative overflow-hidden border-brand/30 bg-brand/15 px-5 py-8.5 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <svg
              className="size-21 text-dot opacity-55"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="relative z-1">
            <strong className="text-md">그룹은 로그인 후 이용할 수 있어요</strong>
            <Sub className="mt-2">
              설정 탭에서 로그인/회원가입을 하면
              <br />
              초대 코드로 친구들과 함께할 수 있어요.
            </Sub>
          </div>
        </Card>
      </Page>
    )
  }

  // ── 그룹 상세 ──
  const selected = groups.find((g) => g.id === selectedId)
  if (selected) {
    return (
      <GroupDetail
        group={selected}
        records={records}
        myId={myId}
        myName={myNick}
        myDates={myDates}
        onBack={() => setSelectedId(null)}
        onChanged={loadGroups}
        onLeft={() => {
          setSelectedId(null)
          loadGroups()
        }}
      />
    )
  }

  // ── 그룹 홈: 내 그룹 목록 + 참여/생성 ──
  return (
    <Page>
      <PageTitle>그룹</PageTitle>
      <Sub>
        {groups.length
          ? `참여 중인 그룹 ${groups.length}개 · 그룹을 눌러 현황을 확인하세요.`
          : '초대 코드로 참여하거나 새 그룹을 만들어 보세요.'}
      </Sub>

      {loading && !groups.length ? (
        <Sub className="mt-4">불러오는 중…</Sub>
      ) : loadError ? (
        <Card>
          <Sub className="text-brand">{loadError}</Sub>
          <Button variant="secondary" className="mt-3" onClick={loadGroups}>
            다시 시도
          </Button>
        </Card>
      ) : (
        groups.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {groups.map((g) => (
              <button
                key={g.id}
                className="flex w-full items-center gap-3.5 rounded-xl border border-line bg-surface p-4 text-left transition-transform active:scale-[.98]"
                onClick={() => setSelectedId(g.id)}
              >
                <GroupPhoto name={g.name} url={g.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold">{g.name}</div>
                  <div className="mt-0.5 text-xs text-dim">
                    멤버 {g.memberCount}/{g.max_members}명{g.created_by === myId && ' · 그룹장'}
                  </div>
                </div>
                <svg
                  className="size-5 flex-none text-dim"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>
        )
      )}

      <JoinCreateCard
        onDone={async (g) => {
          await loadGroups()
          setSelectedId(g.id)
        }}
      />
    </Page>
  )
}
