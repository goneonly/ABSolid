// 서버 통신 (회원 기능) — 운동 기록, 사진, 프로필, 그룹, 응원, 차단, 신고
// 명세: docs/API.md / 관리자 전용 기능은 admin.js / 가입, 로그인은 auth.js
//
// 규칙
// - 비회원(또는 서버 미연결)이면 조회 함수는 빈 값(null, [], {})을 돌려주고 조용히 넘어감
// - 사용자가 직접 누른 동작(그룹 참여, 차단 등)이 실패하면 한국어 문구를 담은 Error 를 던짐. 화면에서는 toast(e.message) 로 보여 줌
import { supabase, currentUserId as uid } from './supabase.js'
import { getRecords, saveRecord, todayKey } from '../lib/storage.js'
import {
  BUCKET,
  workoutPhotoPath,
  workoutPhotoDate,
  avatarPath,
  groupPhotoPath,
  inFolder,
  photoObjectPath,
} from './storagePaths.js'
import { PLAYLIST_ID } from '../lib/youtube.js'

const LOGIN_REQUIRED = '로그인이 필요해요.'
const NO_NAME = '이름 없음'

// 서버 함수가 직접 알려준 거절 사유(raise exception, 코드 P0001)는 그대로 보여주고, 그 외 오류는 일반 안내
const reasonOf = (error, fallback) => (error.code === 'P0001' && error.message ? error.message : fallback)

async function requireUid() {
  const id = await uid()
  if (!id) throw new Error(LOGIN_REQUIRED)
  return id
}

// 서버 함수가 행 하나를 배열로 돌려주는 경우가 있어 첫 행만 꺼냄
const firstRow = (data) => (Array.isArray(data) ? data[0] : data)

// ── 사진 저장소 도우미 ───────────────────────
const PHOTO_TTL = 60 * 60 * 8 // 인증샷 열람 주소 유효 시간 (8시간)

// 압축된 사진(dataURL)을 JPEG 로 업로드. 실패하면 error 반환
async function uploadJpeg(bucket, path, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob()
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  return error
}

// 공개 버킷 사진 주소 (?t= 는 사진을 바꿨을 때 예전 사진이 캐시로 보이지 않게)
function publicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

// 인증샷은 비공개 버킷이라 볼 때마다 서명된 주소가 필요 — 여러 경로를 한 번에 서명해 { 경로: 주소 } 로 돌려줌
export async function signPhotoPaths(photoUrls) {
  const paths = [...new Set(photoUrls.filter(Boolean).map(photoObjectPath))]
  if (!paths.length) return {}
  try {
    const { data } = await supabase.storage.from(BUCKET.photos).createSignedUrls(paths, PHOTO_TTL)
    const out = {}
    for (const item of data || []) {
      if (item?.path && item?.signedUrl) out[item.path] = item.signedUrl
    }
    return out
  } catch {
    return {}
  }
}

// 내 인증샷 폴더의 파일 경로 목록
async function listMyPhotoPaths(userId) {
  const { data: files } = await supabase.storage.from(BUCKET.photos).list(userId, { limit: 1000 })
  return (files || []).map((f) => ({ path: inFolder(userId, f.name), dateKey: workoutPhotoDate(f.name) }))
}

// ── 운동 기록 ────────────────────────────────
// 영상 재생을 시작하면 시청 세션을 만들고, 완료할 때 서버가 지난 시간을 확인해 기록 (v0.7 SQL)
export async function startWorkoutSession(videoSeconds) {
  if (!(await uid())) return null
  const { data, error } = await supabase.rpc('start_workout', { p_video_seconds: Math.round(videoSeconds || 0) })
  return error ? null : data
}

// 반환: 기록된 날짜 키 / 실패하면 Error — retryable=true 면 연결 문제(나중에 다시 시도 가능)
export async function completeWorkout(sessionId) {
  let res
  try {
    res = await supabase.rpc('complete_workout', { p_session: sessionId })
  } catch {
    // 요청 자체가 끊김(오프라인 등)
    const e = new Error('서버에 연결할 수 없어요.')
    e.retryable = true
    throw e
  }
  const { data, error } = res
  if (error) {
    const e = new Error(error.message || '운동 기록에 실패했어요.')
    e.retryable = error.code !== 'P0001' // P0001 = 서버가 판단해 거절 (시청 시간 부족 등)이라 다시 시도해도 같음
    throw e
  }
  return data
}

// 연결 문제로 서버에 못 남긴 완료 기록을 다시 시도 (앱 시작 시) — 성공하면 인증샷도 이어서 업로드
export async function retryPendingCompletions() {
  if (!(await uid())) return
  for (const [date, rec] of Object.entries(getRecords())) {
    if (!rec?.pendingSession) continue
    try {
      const saved = await completeWorkout(rec.pendingSession)
      saveRecord(date, { pendingSession: null })
      if (rec.photo) await uploadPhoto(saved || date, rec.photo)
    } catch (e) {
      if (!e.retryable) saveRecord(date, { pendingSession: null }) // 서버가 거절(만료 등)하면 더 시도하지 않음
    }
  }
}

// 서버의 내 기록 전체를 기기 기록과 같은 모양으로: { 'YYYY-MM-DD': { completed, day, completedAt, photoUrl } }
export async function fetchServerRecords() {
  const userId = await uid()
  if (!userId) return null
  const { data, error } = await supabase
    .from('workouts')
    .select('date, day, completed_at, photo_url')
    .eq('user_id', userId)
  if (error || !data) return null
  const out = {}
  for (const r of data) {
    out[r.date] = { completed: true, day: r.day, completedAt: r.completed_at }
    if (r.photo_url) out[r.date].photoUrl = r.photo_url
  }
  return out
}

// 서버의 내 운동 기록과 인증샷을 모두 삭제. 성공하면 true (비회원은 지울 것이 없어 true)
export async function resetServerWorkouts() {
  const userId = await uid()
  if (!userId) return true
  try {
    const photos = await listMyPhotoPaths(userId)
    if (photos.length) await supabase.storage.from(BUCKET.photos).remove(photos.map((p) => p.path))
  } catch {
    /* 사진 삭제 실패는 기록 삭제를 막지 않음 */
  }
  const { error } = await supabase.from('workouts').delete().eq('user_id', userId)
  if (error) return false
  // 삭제 권한(RLS)이 없으면 오류 없이 0건만 지워지므로 실제로 비워졌는지 확인
  const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  return !count
}

// ── 인증샷 ───────────────────────────────────
// 인증샷을 올리고 그 날짜 기록에 연결하고, 바로 보여줄 수 있는 주소를 돌려줌 (실패하면 null)
export async function uploadPhoto(dateKey, dataUrl) {
  const userId = await uid()
  if (!userId || !dataUrl) return null
  try {
    const path = workoutPhotoPath(userId, dateKey)
    if (await uploadJpeg(BUCKET.photos, path, dataUrl)) return null
    // DB 에는 주소가 아닌 경로를 저장 (비공개 버킷)
    const { error } = await supabase
      .from('workouts')
      .update({ photo_url: path })
      .eq('user_id', userId)
      .eq('date', dateKey)
    if (error) return null
    const { data } = await supabase.storage.from(BUCKET.photos).createSignedUrl(path, PHOTO_TTL)
    return data?.signedUrl || path
  } catch {
    return null
  }
}

// keepDays 일 지난 내 인증샷을 저장소에서 지우고 기록의 사진 연결을 비움
// (본인 파일만 지울 수 있어, 각자 접속할 때 자기 몫을 정리하는 방식 — App 에서 하루 1회 호출)
export async function cleanupOldServerPhotos(keepDays = 30) {
  const userId = await uid()
  if (!userId) return
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)
  const cutoffKey = todayKey(cutoff)
  try {
    const old = (await listMyPhotoPaths(userId)).filter((p) => p.dateKey < cutoffKey)
    if (old.length) await supabase.storage.from(BUCKET.photos).remove(old.map((p) => p.path))
    await supabase
      .from('workouts')
      .update({ photo_url: null })
      .eq('user_id', userId)
      .lt('date', cutoffKey)
      .not('photo_url', 'is', null)
  } catch {
    /* 다음 접속 때 다시 시도 */
  }
}

// ── 내 프로필 ────────────────────────────────
// 역할, 활성 여부 (관리자 메뉴 노출, 이용 제한 계정 확인) — 비회원은 일반 사용자로 취급
export async function fetchMyRole() {
  const userId = await uid()
  if (!userId) return { role: 'user', isActive: true }
  const { data } = await supabase.from('profiles').select('role, is_active').eq('id', userId).maybeSingle()
  return { role: data?.role || 'user', isActive: data?.is_active !== false }
}

// 닉네임 저장 (그룹에서 보이는 이름)
export async function saveNickname(nickname) {
  const userId = await uid()
  if (!userId) return
  await supabase.from('profiles').upsert({ id: userId, nickname: nickname || '' })
}

// 이름, 전화번호 (가입 때 입력한 값 — '회원만 받기' 그룹 참여 조건)
export async function fetchMyProfileInfo() {
  const userId = await uid()
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('full_name, phone').eq('id', userId).maybeSingle()
  if (error) throw new Error('회원 정보를 불러오지 못했어요.')
  return { fullName: data?.full_name || '', phone: data?.phone || '' }
}

export async function updateMyProfileInfo({ fullName, phone }) {
  const userId = await requireUid()
  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', userId)
  if (error) throw new Error('회원 정보 저장에 실패했어요.')
}

// 프로필 사진 올리기. 새 사진 주소를 돌려줌 (실패하면 null)
export async function uploadAvatar(dataUrl) {
  const userId = await uid()
  if (!userId || !dataUrl) return null
  try {
    const path = avatarPath(userId)
    if (await uploadJpeg(BUCKET.avatars, path, dataUrl)) return null
    const avatar_url = publicUrl(BUCKET.avatars, path)
    await supabase.from('profiles').upsert({ id: userId, avatar_url })
    return avatar_url
  } catch {
    return null
  }
}

// 서버에 저장된 내 프로필 사진 주소 (새 기기에서 로그인했을 때 불러오기용)
export async function fetchMyAvatarUrl() {
  const userId = await uid()
  if (!userId) return null
  const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle()
  return error ? null : data?.avatar_url || null
}

export async function deleteAvatar() {
  const userId = await uid()
  if (!userId) return
  try {
    await supabase.storage.from(BUCKET.avatars).remove([avatarPath(userId)])
    await supabase.from('profiles').upsert({ id: userId, avatar_url: null })
  } catch {
    /* 기기에서는 이미 지워짐 */
  }
}

// ── 그룹 ─────────────────────────────────────
// 내가 속한 그룹 목록 (만든 지 오래된 순) + 멤버 수
export async function fetchMyGroups() {
  const userId = await uid()
  if (!userId) return []
  const FAILED = '그룹 목록을 불러오지 못했어요.'
  const { data: mine, error: mineErr } = await supabase.from('group_members').select('group_id').eq('user_id', userId)
  if (mineErr) throw new Error(FAILED)
  if (!mine?.length) return []
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, max_members, members_only, created_by, photo_url, created_at, group_members(count)')
    .in(
      'id',
      mine.map((m) => m.group_id),
    )
    .order('created_at')
  if (error) throw new Error(FAILED)
  return (data || []).map((g) => ({ ...g, memberCount: g.group_members?.[0]?.count ?? 0 }))
}

// 그룹 만들기 — 그룹, 내 멤버십, 초대 코드를 서버 함수가 한 번에 처리 (v0.5 SQL, 하루 5개 제한은 v0.11)
export async function createGroup(name, nickname, { maxMembers, membersOnly } = {}) {
  await requireUid()
  await saveNickname(nickname) // 그룹에서 이름이 보이도록 먼저 반영
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_max_members: Number(maxMembers),
    p_members_only: !!membersOnly,
  })
  const FAILED = '그룹 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'
  if (error) throw new Error(reasonOf(error, FAILED))
  const group = firstRow(data)
  if (!group) throw new Error(FAILED)
  return group
}

// 초대 코드로 참여 — 정원, 회원 제한, 중복 참여는 서버 함수가 확인 (v0.5 SQL)
export async function joinGroup(code, nickname) {
  await requireUid()
  const clean = (code || '').trim().toUpperCase()
  if (clean.length !== 6) throw new Error('초대 코드는 6자리예요.')
  await saveNickname(nickname)
  const { data, error } = await supabase.rpc('join_group', { code: clean })
  if (error) throw new Error(reasonOf(error, '참여에 실패했어요. 잠시 후 다시 시도해 주세요.'))
  const group = firstRow(data)
  // 틀린 코드는 오류가 아니라 빈 결과로 옴 (서버가 틀린 횟수를 세기 위해 — v0.11 SQL)
  if (!group) throw new Error('초대 코드를 찾을 수 없어요. 다시 확인해 주세요.')
  return group
}

// 그룹 나가기 — 그룹장이면 서버가 다음 멤버에게 넘기고, 마지막 멤버면 그룹을 삭제
export async function leaveGroup(group) {
  // 마지막 멤버가 나가면 그룹이 사라지므로 그룹 사진을 먼저 정리 (그룹장만 지울 수 있음)
  if (group.memberCount <= 1 && group.photo_url) await removeGroupPhotoFile(group.id)
  const { error } = await supabase.rpc('leave_group', { p_gid: group.id })
  if (error) throw new Error('그룹 나가기에 실패했어요. 잠시 후 다시 시도해 주세요.')
}

// 그룹 사진 (그룹장만). 새 사진 주소를 돌려줌
export async function uploadGroupPhoto(groupId, dataUrl) {
  const path = groupPhotoPath(groupId)
  if (await uploadJpeg(BUCKET.groupPhotos, path, dataUrl)) throw new Error('그룹 사진 업로드에 실패했어요.')
  const url = publicUrl(BUCKET.groupPhotos, path)
  const { error } = await supabase.rpc('set_group_photo', { p_gid: groupId, p_url: url })
  if (error) throw new Error(reasonOf(error, '그룹 사진 저장에 실패했어요.'))
  return url
}

export async function removeGroupPhoto(groupId) {
  const { error } = await supabase.rpc('set_group_photo', { p_gid: groupId, p_url: null })
  if (error) throw new Error(reasonOf(error, '그룹 사진 삭제에 실패했어요.'))
  await removeGroupPhotoFile(groupId)
}

const removeGroupPhotoFile = (groupId) =>
  supabase.storage
    .from(BUCKET.groupPhotos)
    .remove([groupPhotoPath(groupId)])
    .catch(() => {})

// 그룹 화면 데이터: 멤버(최근 7일 운동한 날짜 포함) + 오늘의 인증샷
// 반환: { members: [{ id, name, avatar, dates: Set }], photos: [{ id, name, url }], hiddenCount }
// 내가 차단한 멤버는 빼고, 뺀 인원 수를 hiddenCount 로 알려줌
export async function fetchGroupStatus(groupId) {
  const { data: rows } = await supabase.from('group_members').select('user_id').eq('group_id', groupId)
  const ids = (rows || []).map((m) => m.user_id)
  if (!ids.length) return { members: [], photos: [], hiddenCount: 0 }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const today = todayKey() // 기록 날짜는 한국 날짜 기준 (toISOString 은 UTC 라 새벽에 하루 밀림)
  const [{ data: profiles }, { data: workouts }, blocked] = await Promise.all([
    supabase.rpc('get_group_profiles', { gid: groupId }),
    supabase.from('workouts').select('user_id, date, photo_url').in('user_id', ids).gte('date', todayKey(weekAgo)),
    fetchBlockedIds(),
  ])
  const profileOf = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  const nameOf = (id) => profileOf[id]?.nickname || NO_NAME

  const datesOf = {} // 멤버 id 별 운동한 날짜 Set
  const todayPhotos = []
  for (const w of workouts || []) {
    if (blocked.has(w.user_id)) continue
    ;(datesOf[w.user_id] ||= new Set()).add(w.date)
    if (w.date === today && w.photo_url) todayPhotos.push(w)
  }
  const signed = await signPhotoPaths(todayPhotos.map((w) => w.photo_url))

  const members = ids
    .filter((id) => !blocked.has(id))
    .map((id) => ({
      id,
      name: nameOf(id),
      avatar: profileOf[id]?.avatar_url || '',
      dates: datesOf[id] || new Set(),
    }))
  const photos = todayPhotos
    .map((w) => ({ id: w.user_id, name: nameOf(w.user_id), url: signed[photoObjectPath(w.photo_url)] }))
    .filter((p) => p.url)
  return { members, photos, hiddenCount: ids.length - members.length }
}

// 리더보드용: 기간 안에 멤버별로 운동한 날짜: { 멤버 id: Set(날짜) }
export async function fetchGroupWorkoutDates(memberIds, startKey, endKey) {
  if (!memberIds?.length) return {}
  const { data } = await supabase
    .from('workouts')
    .select('user_id, date')
    .in('user_id', memberIds)
    .gte('date', startKey)
    .lte('date', endKey)
  const out = {}
  for (const w of data || []) (out[w.user_id] ||= new Set()).add(w.date)
  return out
}

// ── 응원 (v0.8 SQL) ──────────────────────────
// 같은 그룹 멤버에게 하루 한 번. 새 응원 id 를 돌려줌 (오늘 이미 응원했으면 null)
export async function sendCheer(groupId, toUserId) {
  const { data, error } = await supabase.rpc('send_cheer', { p_group: groupId, p_to: toUserId })
  if (error) throw new Error(reasonOf(error, '응원을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'))
  return data
}

// 받은 사람 기기로 푸시 알림 (실패해도 응원 자체는 저장돼 있으므로 조용히 무시)
export async function notifyCheer(cheerId) {
  try {
    await supabase.functions.invoke('notify-cheer', { body: { cheerId } })
  } catch {
    /* noop */
  }
}

// 오늘 멤버들이 받은 응원: { counts: { 멤버 id: 받은 수 }, byMe: Set(내가 응원한 멤버 id) }
export async function fetchTodayCheers(memberIds) {
  const userId = await uid()
  const out = { counts: {}, byMe: new Set() }
  if (!userId || !memberIds?.length) return out
  const { data, error } = await supabase
    .from('cheers')
    .select('from_user, to_user')
    .eq('date', todayKey())
    .in('to_user', memberIds)
  if (error) return out
  for (const c of data || []) {
    out.counts[c.to_user] = (out.counts[c.to_user] || 0) + 1
    if (c.from_user === userId) out.byMe.add(c.to_user)
  }
  return out
}

// 오늘 내가 받은 응원 [{ from_nickname, kind, group_name, created_at }] (차단한 사람의 응원은 서버가 뺌)
export async function fetchReceivedCheers() {
  if (!(await uid())) return []
  const { data, error } = await supabase.rpc('my_received_cheers')
  return error ? [] : data || []
}

// ── 차단 (v0.9 SQL) ──────────────────────────
// 차단한 사람은 그룹 화면과 받은 응원에서 숨기고 서로 응원할 수 없음. 상대에게는 알리지 않음.
const BLOCK_FAILED = '차단 기능을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.'

// 내가 차단한 사용자 id Set (비회원, 오류면 빈 Set 이라 아무도 숨기지 않음)
export async function fetchBlockedIds() {
  if (!(await uid())) return new Set()
  const { data, error } = await supabase.from('user_blocks').select('blocked')
  return error ? new Set() : new Set((data || []).map((r) => r.blocked))
}

export async function blockUser(userId) {
  await requireUid()
  const { error } = await supabase.rpc('block_user', { p_target: userId })
  if (error) throw new Error(reasonOf(error, BLOCK_FAILED))
}

export async function unblockUser(userId) {
  await requireUid()
  const { error } = await supabase.rpc('unblock_user', { p_target: userId })
  if (error) throw new Error(reasonOf(error, BLOCK_FAILED))
}

// 설정 화면의 차단 목록 [{ id, nickname, created_at }]
export async function fetchMyBlocks() {
  if (!(await uid())) return []
  const { data, error } = await supabase.rpc('my_blocks')
  if (error) throw new Error(BLOCK_FAILED)
  return data || []
}

// ── 신고 ─────────────────────────────────────
// 다른 멤버의 인증샷 신고 (하루 20건, 같은 인증샷 중복 신고 불가 — v0.11 SQL)
export async function submitReport(targetUserId, targetDate, reason) {
  const reporter_id = await requireUid()
  const { error } = await supabase.from('reports').insert({
    reporter_id,
    target_user_id: targetUserId,
    target_date: targetDate,
    reason: (reason || '').slice(0, 200),
  })
  if (error) throw new Error(reasonOf(error, '신고 접수에 실패했어요.'))
}

// ── 공지, 앱 설정 (누구나 조회) ────────────────
// 홈 배너에 띄울 공지 1건 (없으면 null)
export async function fetchActiveAnnouncement() {
  if (!supabase) return null
  try {
    const { data } = await supabase
      .from('announcements')
      .select('id, message')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data || null
  } catch {
    return null
  }
}

// 운동 영상 플레이리스트 — 관리자가 바꾼 값이 있으면 그 값, 없으면 기본값
export async function getPlaylistId() {
  if (!supabase) return PLAYLIST_ID
  try {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'playlist_id').maybeSingle()
    return data?.value || PLAYLIST_ID
  } catch {
    return PLAYLIST_ID
  }
}
