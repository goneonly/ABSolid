// 계정과 모든 데이터 삭제 — 회원 탈퇴(delete-account)와 관리자 계정 삭제(admin-delete-user)가 함께 씀
// admin: service_role 클라이언트
//
// 순서가 중요:
//   1) 그룹장 위임 — groups.created_by 는 cascade 가 아니라서 먼저 정리해야 계정 삭제가 됨
//      (남은 멤버가 있으면 그룹장을 넘기고, 마지막 멤버였던 그룹만 삭제 — v0.5-groups-and-fixes.sql)
//   2) auth.users 삭제. profiles, workouts, group_members, cheers, reports, user_blocks, push 구독 등은 cascade 로 함께 삭제
//   3) Storage 사진 정리 — 계정 삭제가 끝난 뒤에 함 (삭제가 실패했는데 사진만 지워지는 일이 없게).
//      사진 정리가 실패해도 계정은 이미 삭제됐으므로 오류로 보지 않음 (남은 파일은 주인 없는 파일)
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function purgeUser(admin: SupabaseClient, uid: string) {
  const { data: deletedGroups, error: hErr } = await admin.rpc('handoff_user_groups', { p_uid: uid })
  if (hErr) throw hErr
  // setof uuid 응답은 문자열 배열 (객체 형태로 와도 처리)
  // 경로 규칙은 src/server/storagePaths.js 의 groupPhotoPath 와 같음: {groupId}/photo.jpg
  const emptied = ((deletedGroups || []) as Array<string | Record<string, string>>)
    .map((r) => (typeof r === 'string' ? r : r.handoff_user_groups))
    .filter(Boolean)
    .map((gid) => `${gid}/photo.jpg`)

  const { error: dErr } = await admin.auth.admin.deleteUser(uid)
  if (dErr) throw dErr

  try {
    if (emptied.length) await admin.storage.from('group-photos').remove(emptied)
    for (const bucket of ['photos', 'avatars']) {
      const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 })
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`))
    }
  } catch {
    /* 사진 정리 실패는 무시 — 계정 삭제는 완료됨 */
  }
}
