// 그룹 상세 화면: 그룹 정보, 멤버 현황, 리더보드, 오늘의 인증샷
import { t } from '../../lib/i18n.js'
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
  kickMember,
  fetchGroupBans,
  unbanMember,
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
  MiniButton,
  Page,
  Sub,
  ChevronIcon,
} from '../../components/ui.jsx'
import {
  LeaderboardSkeleton,
  MemberListSkeleton,
  PhotoGridSkeleton,
  TitleSkeleton,
} from '../../components/skeletons.jsx'
import { CameraArt } from '../../components/EmptyArt.jsx'
import MemberActions from './MemberActions.jsx'
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
  const [menuFor, setMenuFor] = useState(null) // 더보기를 연 멤버
  const [bans, setBans] = useState([]) // 그룹장이 참여를 막은 사람
  const isOwner = group.created_by === myId
  // 실제 멤버 수: 차단해 숨긴 멤버도 포함. 아직 불러오기 전이면 목록에서 받은 수
  const memberCount = members.length + hiddenCount || group.memberCount

  async function cheerFor(member) {
    setCheering(member.id)
    try {
      const cheerId = await sendCheer(group.id, member.id)
      if (cheerId) {
        notifyCheer(cheerId) // 받은 사람에게 푸시 (기다리지 않음)
        toast(t('{name}님에게 응원을 보냈어요!', { name: member.name }))
      } else {
        toast(t('오늘은 이미 응원했어요. 내일 또 응원해 주세요!'))
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
      if (isOwner) setBans(await fetchGroupBans(group.id).catch(() => []))
    } catch {
      /* 네트워크 오류 시 조용히 패스 */
    }
    setLoaded(true)
    setBusy(false)
  }, [group.id, isOwner])

  useEffect(() => {
    load()
  }, [load])

  async function onLeave() {
    const msg =
      memberCount <= 1
        ? t('마지막 멤버라 나가면 그룹이 삭제돼요. 나갈까요?')
        : isOwner
          ? t('그룹에서 나갈까요? 그룹장은 가장 먼저 참여한 멤버에게 넘어가요. 내 운동 기록은 사라지지 않아요.')
          : t('그룹에서 나갈까요? 내 운동 기록은 사라지지 않아요.')
    if (!confirm(msg)) return
    setBusy(true)
    try {
      await leaveGroup({ ...group, memberCount })
      toast(t("'{name}' 그룹에서 나왔어요.", { name: group.name }))
      onLeft()
    } catch (e) {
      toast(e.message)
      setBusy(false)
    }
  }

  async function reportPhoto(p) {
    const reason = prompt(t('{name}의 인증샷을 신고할까요?\n사유를 입력해 주세요. (선택)', { name: p.name }))
    if (reason === null) return // 취소
    try {
      await submitReport(p.id, todayKey(), reason)
      toast(t('신고가 접수됐어요. 관리자가 확인 후 처리할게요.'))
    } catch (e) {
      toast(e.message)
      return
    }
    if (confirm(t('{name}님을 차단할까요?\n이 멤버의 기록과 인증샷이 더 이상 보이지 않아요.', { name: p.name })))
      blockMember(p, true)
  }

  // 차단: 그룹 화면(멤버, 리더보드, 인증샷)과 받은 응원에서 숨기고, 서로 응원 불가. 상대에게는 알리지 않음.
  async function blockMember(m, confirmed = false) {
    if (
      !confirmed &&
      !confirm(
        [
          t('{name}님을 차단할까요?', { name: m.name }),
          '',
          t('• 그룹 화면에서 이 멤버의 기록과 인증샷이 보이지 않아요.'),
          t('• 서로 응원을 보낼 수 없어요.'),
          t('• 상대에게는 알리지 않아요.'),
          '',
          t('설정의 차단한 사용자에서 언제든 해제할 수 있어요.'),
        ].join('\n'),
      )
    )
      return
    try {
      await blockUser(m.id)
      toast(t('{name}님을 차단했어요.', { name: m.name }))
      load()
    } catch (e) {
      toast(e.message)
    }
  }

  // 그룹장: 내보내기 (ban 이면 같은 초대 코드로 다시 들어오지 못하게)
  async function kick(m, ban) {
    const msg = ban
      ? t("{name}님을 내보내고 다시 들어오지 못하게 할까요?\n아래 '참여를 막은 사람'에서 언제든 풀 수 있어요.", {
          name: m.name,
        })
      : t('{name}님을 그룹에서 내보낼까요?\n초대 코드가 있으면 다시 참여할 수 있어요.', { name: m.name })
    if (!confirm(msg)) return
    setBusy(true)
    try {
      await kickMember(group.id, m.id, { ban })
      toast(t('{name}님을 그룹에서 내보냈어요.', { name: m.name }))
      setMenuFor(null)
      await load()
      onChanged() // 그룹 목록의 멤버 수 갱신
    } catch (e) {
      toast(e.message)
      setBusy(false)
    }
  }

  async function unban(b) {
    const name = b.nickname || t('이름 없음')
    if (!confirm(t('{name}님의 참여 막기를 풀까요? 초대 코드로 다시 참여할 수 있게 돼요.', { name }))) return
    try {
      await unbanMember(group.id, b.user_id)
      setBans((prev) => prev.filter((x) => x.user_id !== b.user_id))
      toast(t('{name}님의 참여 막기를 풀었어요.', { name }))
    } catch (e) {
      toast(e.message)
    }
  }

  function copyCode() {
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    const fail = () => toast(t('복사하지 못했어요. 초대 코드: {code}', { code: group.invite_code }))
    if (!navigator.clipboard?.writeText) return fail()
    navigator.clipboard.writeText(group.invite_code).then(done, fail)
  }

  // 오늘의 인증샷: 서버 사진 + (서버에 아직 없으면) 내 로컬 사진 보충
  const myLocalPhoto = records[todayKey()]?.photo
  const todayPhotos = [...photos]
  if (myId && myLocalPhoto && !todayPhotos.some((p) => p.id === myId)) {
    todayPhotos.unshift({ id: myId, name: myName || t('나'), url: myLocalPhoto })
  }

  return (
    <Page>
      <button className="hit -ml-1 flex items-center gap-1 py-1 text-sm text-dim" onClick={onBack}>
        <ChevronIcon left className="size-4.5" />
        {t('그룹 목록')}
      </button>

      <Card className="mt-2">
        <div className="flex items-center gap-4">
          <GroupPhotoEditor group={group} editable={isOwner} onChanged={onChanged} />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-xl font-bold tracking-tight">{group.name}</h2>
            <div className="mt-1 text-xs text-dim">
              {t('멤버 {count}/{max}명', { count: memberCount, max: group.max_members })}
              {isOwner && t(' · 내가 그룹장')}
            </div>
          </div>
        </div>
        <LinkButton className="mt-4 w-full rounded-md bg-surface-2 px-4 py-3 text-left text-sm" onClick={copyCode}>
          {t('초대 코드')} <strong className="ml-1 tracking-wider text-fg">{group.invite_code}</strong>
          <span className="float-right inline-flex items-center gap-1">
            {copied && <CheckIcon className="size-3.5" />}
            {copied ? t('복사됨') : t('복사')}
          </span>
        </LinkButton>
      </Card>

      <Card>
        {loaded ? <CardTitle>{t('멤버 현황')}</CardTitle> : <TitleSkeleton />}
        {!loaded ? (
          <MemberListSkeleton />
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
                onMore={m.id === myId ? undefined : () => setMenuFor(m)}
              />
            ))}
          </div>
        )}
        {hiddenCount > 0 && (
          <Sub className="mt-2">
            {t('차단한 멤버 {count}명은 표시되지 않아요. (설정에서 해제)', { count: hiddenCount })}
          </Sub>
        )}
        {isOwner && bans.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <Sub className="text-xs">{t('참여를 막은 사람 {count}명', { count: bans.length })}</Sub>
            {bans.map((b) => (
              <div key={b.user_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{b.nickname || t('이름 없음')}</span>
                <MiniButton onClick={() => unban(b)}>{t('막기 풀기')}</MiniButton>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-dim">
          <span>
            <i className="mr-2 inline-block size-2.5 rounded-full bg-brand" />
            {t('운동 함')}
          </span>
          <span>
            <i className="mr-2 inline-block size-2.5 rounded-full bg-dot" />
            {t('아직 안 함')}
          </span>
        </div>
      </Card>

      {/* 멤버를 받기 전에는 같은 자리에 리더보드 모양 자리표시 (받은 뒤 카드가 갑자기 끼어들어 화면이 밀리지 않게) */}
      {loaded ? (
        <Leaderboard members={members} myId={myId} myName={myName} records={records} />
      ) : (
        <LeaderboardSkeleton />
      )}

      <Card>
        {loaded ? <CardTitle>{t('오늘의 인증샷')}</CardTitle> : <TitleSkeleton />}
        {/* 받기 전에는 '인증샷이 없어요' 대신 자리표시 (아직 모르는데 없다고 보이지 않게) */}
        {!loaded && !todayPhotos.length ? (
          <PhotoGridSkeleton />
        ) : todayPhotos.length ? (
          <div className="mt-4 grid max-h-87 grid-cols-3 gap-2 overflow-y-auto overscroll-contain">
            {todayPhotos.map((p) => (
              <figure key={p.id}>
                <img
                  className="aspect-square w-full rounded-md border border-line bg-surface-2 object-cover"
                  src={p.url}
                  alt={t('{name}의 오늘 인증샷', { name: p.name })}
                  loading="lazy"
                />
                <figcaption className="mt-1 text-center text-xs text-dim">
                  <span className="block truncate">{p.id === myId ? myName || p.name : p.name}</span>
                  {p.id !== myId && (
                    <span className="mt-1 flex justify-center gap-4">
                      <button className="hit underline" onClick={() => reportPhoto(p)} aria-label={t('이 사진 신고')}>
                        {t('신고')}
                      </button>
                      <button
                        className="hit underline"
                        onClick={() => blockMember(p)}
                        aria-label={t('{name}님 차단하기', { name: p.name })}
                      >
                        {t('차단')}
                      </button>
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState className="mt-2" art={<CameraArt />} title={t('아직 오늘의 인증샷이 없어요')}>
            {t('운동을 마치고 첫 인증샷의 주인공이 되어 보세요!')}
          </EmptyState>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between px-1">
        <button
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface-2 text-dim active:scale-[.94] disabled:opacity-50"
          onClick={load}
          disabled={busy}
          aria-label={t('새로고침')}
          title={t('새로고침')}
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
          {t('그룹 나가기')}
        </LinkButton>
      </div>
      {menuFor && (
        <MemberActions
          member={menuFor}
          isOwner={isOwner}
          busy={busy}
          onBlock={() => {
            const m = menuFor
            setMenuFor(null)
            blockMember(m)
          }}
          onKick={(ban) => kick(menuFor, ban)}
          onClose={() => setMenuFor(null)}
        />
      )}
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
    }, t('그룹 사진을 바꿨어요.'))

  return (
    <>
      <button
        className="relative flex-none rounded-full disabled:opacity-60"
        aria-label={group.photo_url ? t('그룹 사진 관리') : t('그룹 사진 추가')}
        disabled={busy}
        onClick={() => (group.photo_url ? setShowSheet(true) : fileRef.current?.click())}
      >
        {photo}
        <CameraBadge className="size-6 border-2" iconClassName="size-3" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {showSheet && (
        <PhotoActionSheet
          title={t('그룹 사진')}
          busy={busy}
          onReplace={() => fileRef.current?.click()}
          onRemove={() => run(() => removeGroupPhoto(group.id))}
          onClose={() => setShowSheet(false)}
        />
      )}
    </>
  )
}
