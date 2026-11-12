// 그룹 상세 화면: 그룹 정보, 멤버 현황, 리더보드, 오늘의 인증샷
import { useEffect, useState, useCallback, useRef } from 'react'
import { todayKey, getProfile } from '../../lib/storage.js'
import {
  leaveGroup,
  fetchGroupStatus,
  uploadGroupPhoto,
  removeGroupPhoto,
  sendCheer,
  notifyCheer,
  fetchTodayCheers,
  blockUser,
  submitReport,
} from '../../server/api.js'
import { toast } from '../../lib/toast.js'
import Leaderboard from '../../components/Leaderboard.jsx'
import { CameraBadge, PhotoActionSheet, readPickedImage } from '../../components/PhotoPicker.jsx'
import {
  Card,
  CardTitle,
  CheckIcon,
  EmptyState,
  GroupPhoto,
  LinkButton,
  Page,
  Skeleton,
  Sub,
  ChevronIcon,
} from '../../components/ui.jsx'
import { CameraArt } from '../../components/EmptyArt.jsx'
import MemberRow from './MemberRow.jsx'

export default function GroupDetail({ group, records, myId, myName, myDates, onBack, onChanged, onLeft }) {
  const [members, setMembers] = useState([])
  const [photos, setPhotos] = useState([])
  const [hiddenCount, setHiddenCount] = useState(0) // 내가 차단해서 숨긴 멤버 수
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cheers, setCheers] = useState({ counts: {}, byMe: new Set() })
  const [cheering, setCheering] = useState(null) // 응원 보내는 중인 멤버 id
  const isOwner = group.created_by === myId

  async function cheerFor(member) {
    setCheering(member.id)
    try {
      const cheerId = await sendCheer(group.id, member.id)
      if (cheerId) {
        notifyCheer(cheerId) // 받은 사람에게 푸시 (기다리지 않음)
        toast(`${member.name}님에게 응원을 보냈어요!`)
      } else {
        toast('오늘은 이미 응원했어요. 내일 또 응원해 주세요!')
      }
      setCheers((prev) => ({
        counts: cheerId ? { ...prev.counts, [member.id]: (prev.counts[member.id] || 0) + 1 } : prev.counts,
        byMe: new Set([...prev.byMe, member.id]),
      }))
    } catch (e) {
      toast(e.message)
    }
    setCheering(null)
  }

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const { members, photos, hiddenCount } = await fetchGroupStatus(group.id)
      setMembers(members)
      setPhotos(photos)
      setHiddenCount(hiddenCount || 0)
      setCheers(await fetchTodayCheers(members.map((m) => m.id)))
    } catch {
      /* 네트워크 오류 시 조용히 패스 */
    }
    setLoaded(true)
    setBusy(false)
  }, [group.id])

  useEffect(() => {
    load()
  }, [load])

  async function onLeave() {
    const count = members.length + hiddenCount || group.memberCount // 차단해 숨긴 멤버도 실제 멤버
    const msg =
      count <= 1
        ? '마지막 멤버라 나가면 그룹이 삭제돼요. 나갈까요?'
        : isOwner
          ? '그룹에서 나갈까요? 그룹장은 가장 먼저 참여한 멤버에게 넘어가요. 내 운동 기록은 사라지지 않아요.'
          : '그룹에서 나갈까요? 내 운동 기록은 사라지지 않아요.'
    if (!confirm(msg)) return
    setBusy(true)
    try {
      await leaveGroup({ ...group, memberCount: count })
      toast(`'${group.name}' 그룹에서 나왔어요.`)
      onLeft()
    } catch (e) {
      toast(e.message)
      setBusy(false)
    }
  }

  async function reportPhoto(p) {
    const reason = prompt(`${p.name}의 인증샷을 신고할까요?\n사유를 입력해 주세요. (선택)`)
    if (reason === null) return // 취소
    try {
      await submitReport(p.id, todayKey(), reason)
      toast('신고가 접수됐어요. 관리자가 확인 후 처리할게요.')
    } catch (e) {
      toast(e.message)
      return
    }
    if (confirm(`${p.name}님을 차단할까요?\n이 멤버의 기록과 인증샷이 더 이상 보이지 않아요.`)) blockMember(p, true)
  }

  // 차단: 그룹 화면(멤버, 리더보드, 인증샷)과 받은 응원에서 숨기고, 서로 응원 불가. 상대에게는 알리지 않음.
  async function blockMember(m, confirmed = false) {
    if (
      !confirmed &&
      !confirm(
        `${m.name}님을 차단할까요?\n\n` +
          '• 그룹 화면에서 이 멤버의 기록과 인증샷이 보이지 않아요.\n' +
          '• 서로 응원을 보낼 수 없어요.\n' +
          '• 상대에게는 알리지 않아요.\n\n' +
          '설정의 차단한 사용자에서 언제든 해제할 수 있어요.',
      )
    )
      return
    try {
      await blockUser(m.id)
      toast(`${m.name}님을 차단했어요.`)
      load()
    } catch (e) {
      toast(e.message)
    }
  }

  function copyCode() {
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    const fail = () => toast(`복사하지 못했어요. 초대 코드: ${group.invite_code}`)
    if (!navigator.clipboard?.writeText) return fail()
    navigator.clipboard.writeText(group.invite_code).then(done, fail)
  }

  // 오늘의 인증샷: 서버 사진 + (서버에 아직 없으면) 내 로컬 사진 보충
  const myLocalPhoto = records[todayKey()]?.photo
  const todayPhotos = [...photos]
  if (myId && myLocalPhoto && !todayPhotos.some((p) => p.id === myId)) {
    todayPhotos.unshift({ id: myId, name: myName || '나', url: myLocalPhoto })
  }

  return (
    <Page>
      <button className="hit -ml-1 flex items-center gap-1 py-1 text-sm text-dim" onClick={onBack}>
        <ChevronIcon left className="size-4.5" />
        그룹 목록
      </button>

      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <GroupPhotoEditor group={group} editable={isOwner} onChanged={onChanged} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold tracking-tight">{group.name}</h2>
            <div className="mt-1 text-xs text-dim">
              멤버 {members.length + hiddenCount || group.memberCount}/{group.max_members}명
              {isOwner && ' · 내가 그룹장'}
            </div>
          </div>
        </div>
        <LinkButton className="mt-4 w-full rounded-md bg-surface-2 px-4 py-3 text-left text-sm" onClick={copyCode}>
          초대 코드 <strong className="ml-1 tracking-wider text-fg">{group.invite_code}</strong>
          <span className="float-right inline-flex items-center gap-1">
            {copied && <CheckIcon className="size-3.5" />}
            {copied ? '복사됨' : '복사'}
          </span>
        </LinkButton>
      </Card>

      <Card>
        <CardTitle>멤버 현황</CardTitle>
        {!loaded ? (
          <Skeleton inCard lines={3} />
        ) : (
          <div className="mt-2">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                name={m.id === myId ? myName || m.name : m.name}
                isMe={m.id === myId}
                avatar={m.id === myId ? getProfile().avatar || m.avatar : m.avatar}
                dates={m.id === myId ? new Set([...m.dates, ...myDates]) : m.dates}
                cheer={{
                  count: cheers.counts[m.id] || 0,
                  sent: cheers.byMe.has(m.id),
                  busy: cheering === m.id,
                  onCheer: () => cheerFor(m),
                }}
                onBlock={m.id === myId ? undefined : () => blockMember(m)}
              />
            ))}
          </div>
        )}
        {hiddenCount > 0 && <Sub className="mt-2">차단한 멤버 {hiddenCount}명은 표시되지 않아요. (설정에서 해제)</Sub>}
        <div className="mt-3 flex items-center gap-4 text-xs text-dim">
          <span>
            <i className="mr-2 inline-block size-2.5 rounded-full bg-brand" />
            운동 함
          </span>
          <span>
            <i className="mr-2 inline-block size-2.5 rounded-full bg-dot" />
            아직 안 함
          </span>
        </div>
      </Card>

      {loaded && <Leaderboard members={members} myId={myId} myName={myName} records={records} />}

      <Card>
        <CardTitle>오늘의 인증샷</CardTitle>
        {todayPhotos.length ? (
          <div className="mt-4 grid max-h-87 grid-cols-3 gap-2 overflow-y-auto overscroll-contain">
            {todayPhotos.map((p) => (
              <figure key={p.id}>
                <img
                  className="aspect-square w-full rounded-md border border-line bg-surface-2 object-cover"
                  src={p.url}
                  alt={`${p.name}의 오늘 인증샷`}
                  loading="lazy"
                />
                <figcaption className="mt-1 text-center text-xs text-dim">
                  <span className="block truncate">{p.id === myId ? myName || p.name : p.name}</span>
                  {p.id !== myId && (
                    <span className="mt-1 flex justify-center gap-4">
                      <button className="hit underline" onClick={() => reportPhoto(p)} aria-label="이 사진 신고">
                        신고
                      </button>
                      <button
                        className="hit underline"
                        onClick={() => blockMember(p)}
                        aria-label={`${p.name}님 차단하기`}
                      >
                        차단
                      </button>
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState className="mt-2" art={<CameraArt />} title="아직 오늘의 인증샷이 없어요">
            운동을 마치고 첫 인증샷의 주인공이 되어 보세요!
          </EmptyState>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between px-1">
        <button
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-2 text-dim active:scale-[.94] disabled:opacity-50"
          onClick={load}
          disabled={busy}
          aria-label="새로고침"
          title="새로고침"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
        <LinkButton className="px-1 py-3 underline" onClick={onLeave} disabled={busy}>
          그룹 나가기
        </LinkButton>
      </div>
    </Page>
  )
}

// 그룹 사진 — 그룹장만 바꿀 수 있음 (사진이 없으면 누르면 바로 고르기, 있으면 교체, 삭제 선택지)
function GroupPhotoEditor({ group, editable, onChanged }) {
  const fileRef = useRef(null)
  const [showSheet, setShowSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const photo = <GroupPhoto name={group.name} url={group.photo_url} className="size-16 text-xl" />

  if (!editable) return photo

  // 서버 작업을 실행하고 목록을 새로 불러옴 — 실패하면 사유를 토스트로
  async function run(work, doneMessage) {
    setBusy(true)
    try {
      if ((await work()) !== false) {
        await onChanged()
        if (doneMessage) toast(doneMessage)
      }
    } catch (err) {
      toast(err.message)
    }
    setBusy(false)
    setShowSheet(false)
  }

  const handleFile = (e) =>
    run(async () => {
      const dataUrl = await readPickedImage(e)
      if (!dataUrl) return false // 아무것도 고르지 않음
      await uploadGroupPhoto(group.id, dataUrl)
    }, '그룹 사진을 바꿨어요.')

  return (
    <>
      <button
        className="relative flex-none rounded-full disabled:opacity-60"
        aria-label={group.photo_url ? '그룹 사진 관리' : '그룹 사진 추가'}
        disabled={busy}
        onClick={() => (group.photo_url ? setShowSheet(true) : fileRef.current?.click())}
      >
        {photo}
        <CameraBadge className="size-6 border-2" iconClassName="size-3" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {showSheet && (
        <PhotoActionSheet
          title="그룹 사진"
          busy={busy}
          onReplace={() => fileRef.current?.click()}
          onRemove={() => run(() => removeGroupPhoto(group.id))}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  )
}
