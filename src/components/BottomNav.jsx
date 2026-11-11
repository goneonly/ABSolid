import { cx } from './ui.jsx'

const NAV_BTN = 'flex h-full flex-col items-center justify-center gap-1 text-xs [&>svg]:size-6'
// 가운데 큰 버튼: 빨간 원 안에는 아이콘만, 글자는 원 아래 (빨강 바탕의 작은 흰 글자는 대비 부족)
const NAV_START = 'group mx-auto -mt-8 flex flex-col items-center gap-1 text-xs font-bold text-fg'
const NAV_START_CIRCLE =
  'flex size-16 items-center justify-center rounded-full bg-brand text-white shadow-brand transition-transform group-active:scale-[.94] [&>svg]:size-7'

export default function BottomNav({ view, onChange }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 grid h-20 w-full max-w-120 -translate-x-1/2 grid-cols-3 items-center border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <button className={cx(NAV_BTN, view === 'group' ? 'text-fg' : 'text-dim')} onClick={() => onChange('group')}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.8 19c.7-3 3.2-4.6 6.2-4.6s5.5 1.6 6.2 4.6" />
          <circle cx="17" cy="9.5" r="2.4" />
          <path d="M16.5 14.6c2.4.2 4.2 1.5 4.7 4" />
        </svg>
        그룹
      </button>
      {view === 'home' ? (
        <button className={NAV_START} onClick={() => onChange('workout')} aria-label="운동 시작">
          <span className={NAV_START_CIRCLE}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          시작
        </button>
      ) : (
        <button className={NAV_START} onClick={() => onChange('home')} aria-label="홈으로">
          <span className={NAV_START_CIRCLE}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5.5 9.5V21h13V9.5" />
            </svg>
          </span>
          홈
        </button>
      )}
      <button
        className={cx(NAV_BTN, view === 'settings' ? 'text-fg' : 'text-dim')}
        onClick={() => onChange('settings')}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.6h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z" />
        </svg>
        설정
      </button>
    </nav>
  )
}
