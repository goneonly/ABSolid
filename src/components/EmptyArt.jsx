// 빈 화면 안내용 작은 그림 (EmptyState 의 art) — 단순한 선 아이콘. 채우기와 색 점 없이 currentColor(회색) 선만 씀

// 카메라: 인증샷이 없을 때
export function CameraArt() {
  return (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M33 18l5-9h20l5 9" />
      <rect x="10" y="18" width="76" height="46" rx="10" />
      <circle cx="48" cy="41" r="13" />
    </svg>
  )
}

// 사람 셋: 참여한 그룹이 없을 때
export function GroupArt() {
  return (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="22" cy="30" r="8" />
      <path d="M8 60c1.5-9 7-14 14-14" />
      <circle cx="74" cy="30" r="8" />
      <path d="M88 60c-1.5-9-7-14-14-14" />
      <circle cx="48" cy="24" r="10" />
      <path d="M28 62c2-12 9.5-18 20-18s18 6 20 18" />
    </svg>
  )
}

// 자물쇠: 로그인이 필요할 때
export function LockArt() {
  // 단순한 선 아이콘: 고리 + 몸통 테두리만
  return (
    <svg viewBox="0 0 96 72" fill="none" aria-hidden="true">
      <path d="M38 34v-8a10 10 0 0 1 20 0v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="30" y="34" width="36" height="28" rx="7" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}
