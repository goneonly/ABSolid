// 그룹 탭: 내 그룹 목록 → 그룹을 누르면 상세 화면 (비회원에게는 로그인 안내)
import { useEffect, useState, useCallback } from 'react'
import { lastNDays, getProfile } from '../storage.js'
import { supabase } from '../supabase.js'
import { fetchMyGroups } from '../api.js'
import { Button, Card, EmptyState, GroupPhoto, Page, PageTitle, Skeleton, Sub } from '../components/ui.jsx'
import { GroupArt, LockArt } from '../components/EmptyArt.jsx'
import MemberRow from './group/MemberRow.jsx'
import JoinCreateCard from './group/JoinCreateCard.jsx'
import GroupDetail from './group/GroupDetail.jsx'

// onRequestLogin: 비회원이 로그인 화면으로 가기 (App 이 비회원 선택을 해제)
export default function Group({ records, session, onRequestLogin }) {
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
  const myId = session?.user?.id

  // ── 미로그인/서버 미연결 ──
  if (!supabase || !session) {
    return (
      <Page>
        <PageTitle>그룹</PageTitle>
        <Card>
          <MemberRow name={myNick || '나'} isMe={!!myNick} dates={myDates} />
        </Card>
        <Card>
          <EmptyState art={<LockArt />} title="그룹은 로그인 후 이용할 수 있어요">
            로그인하면 초대 코드로 친구들과 함께할 수 있어요.
          </EmptyState>
          {/* 서버 연결이 없으면(로컬 개발 등) 로그인 자체가 불가해 버튼을 숨김 */}
          {supabase && (
            <Button className="mt-4" onClick={onRequestLogin}>
              로그인 / 회원가입
            </Button>
          )}
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
        <Skeleton lines={2} />
      ) : loadError ? (
        <Card>
          <Sub className="text-danger">{loadError}</Sub>
          <Button variant="secondary" className="mt-3" onClick={loadGroups}>
            다시 시도
          </Button>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState art={<GroupArt />} title="아직 참여한 그룹이 없어요">
            친구에게 받은 초대 코드로 참여하거나, 새 그룹을 만들어 친구를 초대해 보세요.
          </EmptyState>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {groups.map((g) => (
            <button
              key={g.id}
              className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition-transform active:scale-[.98]"
              onClick={() => setSelectedId(g.id)}
            >
              <GroupPhoto name={g.name} url={g.photo_url} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold">{g.name}</div>
                <div className="mt-1 text-xs text-dim">
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
