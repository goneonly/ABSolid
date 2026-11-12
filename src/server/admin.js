// 관리자 화면 전용 서버 통신 — 권한은 서버 RLS(is_admin)가 검증하므로 일반 회원이 호출해도 실패함
// (회원 기능은 api.js, 명세는 docs/API.md)
import { supabase } from './supabase.js'
import { signPhotoPaths } from './api.js'
import { BUCKET, workoutPhotoPath, photoObjectPath } from './storagePaths.js'

// ── 대시보드 ─────────────────────────────────
export async function fetchStats() {
  const { data, error } = await supabase.rpc('admin_stats')
  if (error) throw new Error('통계를 불러오지 못했어요. admin.sql 실행 여부를 확인해 주세요.')
  return data
}

// ── 회원 관리 ────────────────────────────────
export async function fetchUsers(query = '') {
  let q = supabase
    .from('profiles')
    .select('id, nickname, full_name, phone, role, is_active, avatar_url, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (query.trim()) {
    const s = query.trim().replace(/[%,]/g, '')
    q = q.or(`nickname.ilike.%${s}%,full_name.ilike.%${s}%,phone.ilike.%${s}%`)
  }
  const { data, error } = await q
  if (error) throw new Error('회원 목록을 불러오지 못했어요.')
  return data || []
}

export async function setUserActive(id, active) {
  const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', id)
  if (error) throw new Error('변경에 실패했어요.')
}

// 계정 완전 삭제 (테스트 계정 정리 등) — 되돌릴 수 없음. 서버(Edge Function)가 관리자인지 다시 확인하고,
// 본인, 다른 관리자 계정은 거절함. 삭제 과정은 회원 탈퇴와 같음 (그룹장 위임, 계정, 기록 삭제, 사진 정리 순서)
export async function deleteUserAdmin(id) {
  const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: id } })
  if (!error) return
  // 서버가 돌려준 이유(예: "관리자 계정은 삭제할 수 없어요.")가 있으면 그대로 보여 줌
  const reason = await error.context
    ?.json?.()
    .then((b) => b?.error)
    .catch(() => null)
  throw new Error(reason || '계정 삭제에 실패했어요. 함수가 배포됐는지 확인해 주세요.')
}

// ── 그룹 관리 ────────────────────────────────
export async function fetchGroupsAdmin() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, max_members, created_at, group_members(count)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error('그룹 목록을 불러오지 못했어요.')
  return (data || []).map((g) => ({
    ...g,
    memberCount: g.group_members?.[0]?.count ?? 0,
  }))
}

export async function deleteGroupAdmin(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw new Error('그룹 해산에 실패했어요.')
}

// ── 신고 처리 ────────────────────────────────
// 관리자: 미처리 신고 목록 (신고 대상 사진, 닉네임 포함)
export async function fetchReports() {
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_user_id, target_date, reason, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error('신고 목록을 불러오지 못했어요.')
  if (!reports?.length) return []
  const ids = [...new Set(reports.flatMap((r) => [r.reporter_id, r.target_user_id]))]
  const [{ data: profs }, { data: works }] = await Promise.all([
    supabase.from('profiles').select('id, nickname').in('id', ids),
    supabase
      .from('workouts')
      .select('user_id, date, photo_url')
      .in(
        'user_id',
        reports.map((r) => r.target_user_id),
      )
      .in(
        'date',
        reports.map((r) => r.target_date),
      ),
  ])
  const names = Object.fromEntries((profs || []).map((p) => [p.id, p.nickname]))
  const signed = await signPhotoPaths((works || []).map((w) => w.photo_url))
  const photoOf = {} // '회원id|날짜'별 인증샷 주소
  for (const w of works || []) {
    if (w.photo_url) photoOf[`${w.user_id}|${w.date}`] = signed[photoObjectPath(w.photo_url)] || null
  }
  return reports.map((r) => ({
    ...r,
    reporterName: names[r.reporter_id] || '이름 없음',
    targetName: names[r.target_user_id] || '이름 없음',
    photoUrl: photoOf[`${r.target_user_id}|${r.target_date}`] || null,
  }))
}

// 관리자: 신고 처리 — action: 'remove'(사진 삭제) | 'dismiss'(기각)
export async function resolveReport(report, action) {
  if (action === 'remove') {
    await supabase.storage.from(BUCKET.photos).remove([workoutPhotoPath(report.target_user_id, report.target_date)])
    await supabase
      .from('workouts')
      .update({ photo_url: null })
      .eq('user_id', report.target_user_id)
      .eq('date', report.target_date)
  }
  const { error } = await supabase
    .from('reports')
    .update({ status: action === 'remove' ? 'resolved' : 'dismissed' })
    .eq('id', report.id)
  if (error) throw new Error('신고 처리에 실패했어요.')
}

// ── 공지 ────────────────────────────────────
export async function fetchAnnouncementsAdmin() {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, message, active, created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new Error('공지 목록을 불러오지 못했어요.')
  return data || []
}

export async function createAnnouncement(message) {
  const { error } = await supabase.from('announcements').insert({ message: message.trim() })
  if (error) throw new Error('공지 등록에 실패했어요.')
}

export async function setAnnouncementActive(id, active) {
  const { error } = await supabase.from('announcements').update({ active }).eq('id', id)
  if (error) throw new Error('변경에 실패했어요.')
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw new Error('삭제에 실패했어요.')
}

// ── 운동 프로그램 (플레이리스트 변경 — 조회는 api.js 의 getPlaylistId) ──
export async function setPlaylistId(value) {
  const { error } = await supabase.from('app_config').upsert({ key: 'playlist_id', value: value.trim() })
  if (error) throw new Error('플레이리스트 변경에 실패했어요.')
}
