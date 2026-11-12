import { HomeIcon, cx } from './ui.jsx'

const NAV_BTN = 'flex h-full flex-col items-center justify-center gap-1 text-xs [&>svg]:size-6'
// 가운데 큰 버튼: 빨간 원 안에는 아이콘만, 글자는 원 아래 (빨강 바탕의 작은 흰 글자는 대비 부족)
const NAV_START = 'group mx-auto -mt-8 flex flex-col items-center gap-1 text-xs font-bold text-fg'
const NAV_START_CIRCLE =
  'flex size-16 items-center justify-center rounded-full bg-brand text-white transition-transform group-active:scale-[.94] [&>svg]:size-7'

export default function BottomNav({ view, onChange }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 grid h-20 w-full max-w-120 -translate-x-1/2 grid-cols-3 items-center border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <button className={cx(NAV_BTN, view === 'group' ? 'text-fg' : 'text-dim')} onClick={() => onChange('group')}>
        {/* 속이 찬 아이콘: 앞사람(크게)과 뒷사람(작게) */}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="7.8" r="3.6" />
          <path d="M2.3 19c.6-3.6 3.3-5.7 6.7-5.7s6.1 2.1 6.7 5.7a.9.9 0 0 1-.9 1H3.2a.9.9 0 0 1-.9-1Z" />
          <circle cx="17.2" cy="9" r="2.7" />
          <path d="M16.2 14.3c2.9-.2 5 1.5 5.5 4.6a.9.9 0 0 1-.9 1.1h-3.3a3 3 0 0 0 0-1.3c-.3-1.8-1-3.2-2.1-4.2.3-.1.5-.2.8-.2Z" />
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
            <HomeIcon />
          </span>
          홈
        </button>
      )}
      <button
        className={cx(NAV_BTN, view === 'settings' ? 'text-fg' : 'text-dim')}
        onClick={() => onChange('settings')}
      >
        {/* 속이 찬 톱니바퀴, 가운데 구멍은 비워 둠 (evenodd). 얇은 같은 색 테두리로 모서리를 둥글게 */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.6h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
          />
        </svg>
        설정
      </button>
    </nav>
  )
}
