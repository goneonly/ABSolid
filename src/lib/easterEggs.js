// 이스터에그 — 닉네임을 '푸앙이' 또는 '푸앙'으로 하면, 프로필 사진을 올리지 않았을 때 기본 사진이 푸앙이로 바뀜
// (내 설정 화면뿐 아니라 그룹 멤버, 리더보드에서도 그 닉네임이면 똑같이 보임)
export const PUANG_AVATAR = '/avatars/puang.png' // 배경 투명
const PUANG_NAMES = new Set(['푸앙이', '푸앙'])

// 기본 프로필 사진 주소 — 해당 없으면 null (사람 모양 기본 아이콘)
export function easterEggAvatar(nickname) {
  return PUANG_NAMES.has((nickname || '').trim()) ? PUANG_AVATAR : null
}
