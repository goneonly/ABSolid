// 관리자 화면 — 대시보드, 신고 처리, 회원, 그룹, 공지, 운동 프로그램
// 각 카드는 독립된 컴포넌트이고, 서버 통신은 admin.js 에 있음
import { t } from '../lib/i18n.js'
import { useState } from 'react'
import {
  fetchStats,
  fetchUsers,
  setUserActive,
  deleteUserAdmin,
  fetchGroupsAdmin,
  deleteGroupAdmin,
  fetchReports,
  resolveReport,
  fetchAnnouncementsAdmin,
  createAnnouncement,
  setAnnouncementActive,
  deleteAnnouncement,
  setPlaylistId,
} from '../server/admin.js'
import { getPlaylistId } from '../server/api.js'
import { toast } from '../lib/toast.js'
import { useLoad } from '../hooks/useLoad.js'
import { Button, Card, CardTitle, Input, MiniButton, Page, PageTitle, Pill, Sub, cx } from '../components/ui.jsx'

// 회원 삭제 확인에 입력하는 낱말 (화면 언어에 맞게)
const DELETE_WORD = t('확인 낱말|삭제')

const ADMIN_ROW = 'flex items-center gap-3 border-b border-line py-3 last:border-b-0'
const ROW_TITLE = 'truncate text-sm font-bold'
const THUMB = 'size-14 flex-none rounded-md border border-line bg-surface-2 object-cover'

// 관리자 작업 실행 — 성공하면 안내 문구를 띄우고 true, 실패하면 사유를 띄우고 false
async function attempt(work, doneMessage) {
  try {
    await work()
    if (doneMessage) toast(doneMessage)
    return true
  } catch (e) {
    toast(e.message)
    return false
  }
}

// 목록 카드의 상태 문구: 불러오는 중 / 오류 / 비어 있음 (목록이 있으면 아무것도 그리지 않음)
function ListStatus({ loaded, error, empty, emptyText }) {
  const text = !loaded ? t('불러오는 중…') : error || (empty ? emptyText : '')
  if (!text) return null
  return <Sub className={cx('mt-2', loaded && error && 'text-danger')}>{text}</Sub>
}

function fmtBytes(n) {
  if (!n) return '0 MB'
  const mb = n / 1024 / 1024
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

export default function Admin({ onBack }) {
  return (
    <Page>
      <PageTitle>{t('관리자')}</PageTitle>
      <Sub>{t('서비스 현황을 확인하고 회원, 그룹, 신고를 관리해요.')}</Sub>

      <StatsSection />
      <ReportsSection />
      <UsersSection />
      <GroupsSection />
      <AnnouncementsSection />
      <ProgramSection />

      <Button variant="secondary" className="mt-5" onClick={onBack}>
        {t('설정으로 돌아가기')}
      </Button>
    </Page>
  )
}

// ── 대시보드 ─────────────────────────────────
function StatsSection() {
  const { data: stats, loaded, error } = useLoad(fetchStats)
  const items = stats
    ? [
        [t('전체 회원'), stats.total_users],
        [t('신규 가입 (7일)'), stats.new_users_7d],
        [t('오늘 운동'), stats.active_today],
        [t('활동 회원 (7일)'), stats.active_7d],
        [t('누적 운동 기록'), stats.total_workouts],
        [t('그룹 수'), stats.total_groups],
        [t('미처리 신고'), stats.pending_reports],
        [t('인증샷 용량'), fmtBytes(stats.photos_bytes)],
      ]
    : []

  return (
    <Card>
      <CardTitle>{t('대시보드')}</CardTitle>
      <ListStatus loaded={loaded} error={error} />
      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {items.map(([label, value]) => (
            <div className="rounded-md border border-line bg-surface-2 p-3 text-center" key={label}>
              <div className="text-xl font-extrabold tabular-nums">{value}</div>
              <div className="mt-1 text-xs text-dim">{label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── 신고 처리 ────────────────────────────────
function ReportsSection() {
  const { data, loaded, error, reload } = useLoad(fetchReports)
  const reports = data || []

  // action: 'remove'(사진 삭제) | 'dismiss'(기각)
  async function handle(report, action) {
    const remove = action === 'remove'
    if (!confirm(remove ? t('이 사진을 삭제할까요?') : t('신고를 기각할까요?'))) return
    const done = await attempt(
      () => resolveReport(report, action),
      remove ? t('사진을 삭제했어요.') : t('신고를 기각했어요.'),
    )
    if (done) reload()
  }

  return (
    <Card>
      <CardTitle>{t('신고 처리')}</CardTitle>
      <ListStatus loaded={loaded} error={error} empty={!reports.length} emptyText={t('미처리 신고가 없어요.')} />
      {reports.map((r) => (
        <div className={ADMIN_ROW} key={r.id}>
          {r.photoUrl ? (
            <img className={THUMB} src={r.photoUrl} alt={t('신고된 인증샷')} />
          ) : (
            <div className={cx(THUMB, 'flex items-center justify-center text-xs text-dim')}>{t('삭제됨')}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className={ROW_TITLE}>
              {r.targetName} <span className="text-sm text-dim">({r.target_date})</span>
            </div>
            <div className="text-xs text-dim">
              {t('신고자: {name}', { name: r.reporterName })}
              {r.reason && <> · {t('사유: {reason}', { reason: r.reason })}</>}
            </div>
            <div className="mt-2 flex gap-2">
              <MiniButton danger onClick={() => handle(r, 'remove')}>
                {t('사진 삭제')}
              </MiniButton>
              <MiniButton onClick={() => handle(r, 'dismiss')}>{t('기각')}</MiniButton>
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ── 회원 관리 ────────────────────────────────
function UsersSection() {
  const [query, setQuery] = useState('')
  const { data, loaded, error, reload } = useLoad(() => fetchUsers(query), [query])
  const users = data || []

  async function toggleActive(u) {
    const name = u.nickname || t('이 회원')
    const question = u.is_active
      ? t('{name}을(를) 비활성 처리할까요? 로그인이 차단돼요.', { name })
      : t('{name}의 비활성을 해제할까요?', { name })
    if (!confirm(question)) return
    const done = await attempt(
      () => setUserActive(u.id, !u.is_active),
      u.is_active ? t('비활성 처리했어요.') : t('활성화했어요.'),
    )
    if (done) reload()
  }

  // 되돌릴 수 없는 작업이라 확인 문구를 직접 입력해야 진행
  async function remove(u) {
    const name = u.nickname || t('이 회원')
    const typed = prompt(
      t(
        '{name} 계정을 완전히 삭제할까요?\n운동 기록, 인증샷, 응원, 신고 기록이 모두 지워지고 되돌릴 수 없어요.\n그룹장이면 다른 멤버에게 넘어가고, 혼자인 그룹은 삭제돼요.\n\n계속하려면 "{word}"를 입력하세요.',
        { name, word: DELETE_WORD },
      ),
    )
    if (typed === null) return
    if (typed.trim() !== DELETE_WORD) return toast(t('"{word}"를 정확히 입력해야 삭제돼요.', { word: DELETE_WORD }))
    if (await attempt(() => deleteUserAdmin(u.id), t('{name} 계정을 삭제했어요.', { name }))) reload()
  }

  return (
    <Card>
      <CardTitle>{t('회원 관리')}</CardTitle>
      <Input
        className="mt-3"
        placeholder={t('닉네임, 이름, 전화번호 검색')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ListStatus loaded={loaded} error={error} empty={!users.length} emptyText={t('결과가 없어요.')} />
      {users.map((u) => (
        <div className={ADMIN_ROW} key={u.id}>
          <div className="min-w-0 flex-1">
            <div className={ROW_TITLE}>
              {u.nickname || t('닉네임 없음')}
              {u.role === 'admin' && <Pill>{t('관리자')}</Pill>}
              {!u.is_active && <Pill danger>{t('비활성')}</Pill>}
            </div>
            <div className="text-xs text-dim">
              {u.full_name || t('이름 미등록')}
              {u.phone && <> · {u.phone}</>}
            </div>
          </div>
          {u.role !== 'admin' && (
            <div className="flex flex-none gap-2">
              <MiniButton danger={u.is_active} onClick={() => toggleActive(u)}>
                {u.is_active ? t('동작|비활성') : t('활성화')}
              </MiniButton>
              <MiniButton danger onClick={() => remove(u)}>
                {t('삭제')}
              </MiniButton>
            </div>
          )}
        </div>
      ))}
    </Card>
  )
}

// ── 그룹 관리 ────────────────────────────────
function GroupsSection() {
  const { data, loaded, error, reload } = useLoad(fetchGroupsAdmin)
  const groups = data || []

  async function remove(g) {
    if (!confirm(t("'{name}' 그룹을 해산할까요? 멤버들의 운동 기록은 유지돼요.", { name: g.name }))) return
    if (await attempt(() => deleteGroupAdmin(g.id), t('그룹을 해산했어요.'))) reload()
  }

  return (
    <Card>
      <CardTitle>{t('그룹 관리')}</CardTitle>
      <ListStatus loaded={loaded} error={error} empty={!groups.length} emptyText={t('그룹이 없어요.')} />
      {groups.map((g) => (
        <div className={ADMIN_ROW} key={g.id}>
          <div className="min-w-0 flex-1">
            <div className={ROW_TITLE}>{g.name}</div>
            <div className="text-xs text-dim">
              {g.invite_code} · {t('{count}/{max}명', { count: g.memberCount, max: g.max_members })}
              {g.memberCount === 0 && <Pill danger>{t('빈 그룹')}</Pill>}
            </div>
          </div>
          <MiniButton danger onClick={() => remove(g)}>
            {t('해산')}
          </MiniButton>
        </div>
      ))}
    </Card>
  )
}

// ── 공지 ────────────────────────────────────
function AnnouncementsSection() {
  const { data, error, reload } = useLoad(fetchAnnouncementsAdmin)
  const list = data || []
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!message.trim()) return
    setBusy(true)
    if (await attempt(() => createAnnouncement(message), t('공지를 등록했어요. 홈 상단에 표시돼요.'))) {
      setMessage('')
      reload()
    }
    setBusy(false)
  }

  async function toggle(a) {
    if (await attempt(() => setAnnouncementActive(a.id, !a.active))) reload()
  }

  async function remove(a) {
    if (!confirm(t('이 공지를 삭제할까요?'))) return
    if (await attempt(() => deleteAnnouncement(a.id))) reload()
  }

  return (
    <Card>
      <CardTitle>{t('공지')}</CardTitle>
      <div className="mt-3 flex gap-2">
        <Input
          className="flex-1"
          placeholder={t('홈 배너에 띄울 공지 내용')}
          maxLength={100}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <MiniButton onClick={add} disabled={busy || !message.trim()}>
          {t('등록')}
        </MiniButton>
      </div>
      {error && <Sub className="mt-2 text-danger">{error}</Sub>}
      {list.map((a) => (
        <div className={ADMIN_ROW} key={a.id}>
          <div className="min-w-0 flex-1">
            <div className={cx(ROW_TITLE, !a.active && 'opacity-50')}>{a.message}</div>
            <div className="text-xs text-dim">{a.active ? t('게시 중') : t('숨김')}</div>
          </div>
          <MiniButton onClick={() => toggle(a)}>{a.active ? t('숨기기') : t('게시')}</MiniButton>
          <MiniButton danger onClick={() => remove(a)}>
            {t('삭제')}
          </MiniButton>
        </div>
      ))}
    </Card>
  )
}

// ── 운동 프로그램 ─────────────────────────────
function ProgramSection() {
  const { data: saved } = useLoad(getPlaylistId)
  const [edited, setEdited] = useState(null) // 입력칸을 고치기 전에는 null 이라 서버에 저장된 값을 보여줌
  const [busy, setBusy] = useState(false)
  const value = edited ?? saved ?? ''

  async function save() {
    if (!value.trim()) return
    setBusy(true)
    await attempt(() => setPlaylistId(value), t('플레이리스트를 변경했어요. 다음 운동부터 적용돼요.'))
    setBusy(false)
  }

  return (
    <Card>
      <CardTitle>{t('운동 프로그램')}</CardTitle>
      <Sub className="mt-2">{t('YouTube 플레이리스트 ID (Day 1~30 순서의 30개 영상)')}</Sub>
      <div className="mt-3 flex gap-2">
        <Input className="flex-1" value={value} onChange={(e) => setEdited(e.target.value)} />
        <MiniButton onClick={save} disabled={busy || !value.trim()}>
          {t('저장')}
        </MiniButton>
      </div>
    </Card>
  )
}
