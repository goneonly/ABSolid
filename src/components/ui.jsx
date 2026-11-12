// 공통 UI 컴포넌트 — 반복되는 Tailwind 클래스 조합을 한 곳에서 관리
import { extendTailwindMerge } from 'tailwind-merge'
import { easterEggAvatar } from '../lib/easterEggs.js'

// 클래스 합치기 — 뒤에 온 클래스가 같은 속성의 앞 클래스를 덮어씀
// (index.css @theme에 추가한 커스텀 폰트 크기를 알려줘야 색상 클래스와 구분됨)
export const cx = extendTailwindMerge({
  extend: { theme: { text: ['display'] } },
})

// ── 로고 ─────────────────────────────────────
export function Logo({ size = 26, className }) {
  return (
    <span className={cx('flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="7" fill="var(--color-brand)" />
        <path
          d="M8 18 L13 7 L18 18"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M10 14.5 H16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <strong className="font-extrabold tracking-tight">
        ABS<em className="text-brand not-italic">olid</em>
      </strong>
    </span>
  )
}

// ── 레이아웃 ─────────────────────────────────
export function Page({ className, ...props }) {
  return <main className={cx('flex-1 px-5 pt-2 pb-6', className)} {...props} />
}

export function PageTitle({ className, ...props }) {
  return <h2 className={cx('mb-1 text-xl font-bold tracking-tight', className)} {...props} />
}

export function Sub({ className, ...props }) {
  return <p className={cx('text-sm text-dim', className)} {...props} />
}

export function Card({ className, ...props }) {
  return <section className={cx('mt-4 rounded-xl border border-line bg-surface p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <div className={cx('text-base font-bold', className)} {...props} />
}

// ── 버튼 ─────────────────────────────────────
const BUTTON = {
  primary: 'bg-brand-strong text-white',
  secondary: 'bg-surface-2 text-fg',
  danger: 'bg-surface-2 text-danger',
}

export function Button({ variant = 'primary', className, ...props }) {
  return (
    <button
      className={cx(
        'w-full rounded-lg p-4 text-base font-bold transition-transform active:scale-[.98] disabled:opacity-50 disabled:active:scale-100',
        BUTTON[variant],
        className,
      )}
      {...props}
    />
  )
}

export function MiniButton({ danger, className, ...props }) {
  return (
    <button
      className={cx(
        'flex-none rounded-sm border bg-surface-2 px-3 py-2 text-xs font-bold disabled:opacity-50',
        danger ? 'border-danger/40 text-danger' : 'border-line text-fg',
        className,
      )}
      {...props}
    />
  )
}

// 설정 목록형 버튼 (왼쪽 라벨 + 오른쪽 힌트)
export function RowButton({ danger, hint, children, className, ...props }) {
  return (
    <button
      className={cx(
        'flex w-full items-center justify-between border-b border-line py-4 text-base last:border-b-0 disabled:opacity-50',
        danger && 'text-danger',
        className,
      )}
      {...props}
    >
      {children}
      {hint && <span className="text-xs text-dim">{hint}</span>}
    </button>
  )
}

export function LinkButton({ className, ...props }) {
  return <button className={cx('hit text-xs text-dim disabled:opacity-50', className)} {...props} />
}

// 홈 상단 공지, 리마인더 배너 — 빨강은 주요 버튼, 달성 표시에 아껴 두고 배너는 중립색
export function Banner({ className, ...props }) {
  return (
    <div
      className={cx('mb-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-fg', className)}
      {...props}
    />
  )
}

// ── 뱃지 ─────────────────────────────────────
export function Pill({ danger, className, ...props }) {
  return (
    <span
      className={cx(
        'ml-2 inline-block rounded-full border bg-surface-2 px-2 py-1 align-middle text-xs font-bold',
        danger ? 'border-danger/40 text-danger' : 'border-line text-dim',
        className,
      )}
      {...props}
    />
  )
}

// ── 입력 ─────────────────────────────────────
export function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        'w-full rounded-md border border-line bg-surface-2 px-4 py-3 text-base text-fg outline-none focus:border-brand aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  )
}

export function FieldError({ children }) {
  return <p className="mt-2 text-xs text-danger">{children}</p>
}

// 라벨 + 입력 + 오류 메시지
export function Field({ id, label, error, className, ...inputProps }) {
  return (
    <div className={cx('mt-4', className)}>
      <label htmlFor={id} className="mb-2 block text-sm text-dim">
        {label}
      </label>
      <Input id={id} aria-invalid={!!error} {...inputProps} />
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

// ── 바텀시트 모달 ─────────────────────────────
// onBackdrop을 넘기면 바깥 영역 탭으로 닫힘
export function Modal({ label, onBackdrop, className, children }) {
  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center bg-scrim" onClick={onBackdrop}>
      <div
        className={cx(
          'w-full max-w-120 animate-sheet-up rounded-t-2xl bg-surface px-5 pt-7 pb-[calc(28px+env(safe-area-inset-bottom))]',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={onBackdrop && ((e) => e.stopPropagation())}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalTitle({ className, ...props }) {
  return <h3 className={cx('text-center text-xl font-bold', className)} {...props} />
}

export function ModalText({ className, ...props }) {
  return <p className={cx('mt-2 text-center text-sm text-dim', className)} {...props} />
}

// ── 아바타 ───────────────────────────────────
function PersonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.2 0-8 2.2-8 5.4V21h16v-1.6c0-3.2-3.8-5.4-8-5.4Z" />
    </svg>
  )
}

// 프로필 사진이 없을 때의 기본 모습: 사람 아이콘 (닉네임이 '푸앙이'면 푸앙이 — easterEggs.js)
export function DefaultAvatar({ nickname, iconClassName }) {
  const egg = easterEggAvatar(nickname)
  if (egg) return <img className="block size-full object-contain" src={egg} alt="푸앙이" />
  return <PersonIcon className={iconClassName} />
}

// 그룹, 리더보드용 작은 원형 아바타 (active면 빨간 테두리)
export function MemberAvatar({ name, avatar, active, className }) {
  return (
    <span
      className={cx(
        'flex size-8 flex-none items-center justify-center overflow-hidden rounded-full border-2 bg-surface-2 text-dot',
        active ? 'border-brand' : 'border-dot',
        className,
      )}
    >
      {avatar ? (
        <img className="size-full object-cover" src={avatar} alt={`${name} 프로필 사진`} loading="lazy" />
      ) : (
        <DefaultAvatar nickname={name} iconClassName="size-4" />
      )}
    </span>
  )
}

// 그룹 사진 — 원형, 사진이 없으면 그룹 이름 첫 글자
export function GroupPhoto({ name, url, className }) {
  return (
    <span
      className={cx(
        'flex size-12 flex-none items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-base font-bold text-dim',
        className,
      )}
    >
      {url ? (
        <img className="size-full object-cover" src={url} alt={`${name} 그룹 사진`} loading="lazy" />
      ) : (
        <span aria-hidden="true">{(name || '?').trim().charAt(0)}</span>
      )}
    </span>
  )
}

// ── 아이콘 ───────────────────────────────────
// 글자 기호(✓ ✕ ▲▼)는 기기마다 모양이 달라 SVG 로 통일
const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function CheckIcon({ className = 'size-[1em]' }) {
  return (
    <svg className={cx('inline-block', className)} viewBox="0 0 24 24" {...STROKE}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}

export function CloseIcon({ className = 'size-[1em]' }) {
  return (
    <svg className={cx('inline-block', className)} viewBox="0 0 24 24" {...STROKE}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// 집 모양 (속이 찬 모양, 가운데 문은 비워 둠) — 하단 탭 홈 버튼, 운동 장소의 '집에서'
export function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.3 2.9a1.1 1.1 0 0 1 1.4 0l8 6.7c.2.2.3.5.3.8V20a1 1 0 0 1-1 1h-5.2v-5.6a1 1 0 0 0-1-1h-3.6a1 1 0 0 0-1 1V21H4a1 1 0 0 1-1-1v-9.6c0-.3.1-.6.3-.8Z" />
    </svg>
  )
}

// 목록 줄의 '더 보기'(오른쪽)와 '뒤로'(왼쪽) 꺾쇠
export function ChevronIcon({ left, className = 'size-5' }) {
  return (
    <svg className={cx('flex-none', className)} viewBox="0 0 24 24" {...STROKE} strokeWidth={2}>
      <path d={left ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}

// 순위, 횟수 변동 화살표 (up=true 위, false 아래)
function TrendIcon({ up, className = 'size-[0.8em]' }) {
  return (
    <svg className={cx('inline-block align-[-0.05em]', className)} viewBox="0 0 12 12" aria-hidden="true">
      <path d={up ? 'M6 2 11 10H1Z' : 'M6 10 1 2h10Z'} fill="currentColor" />
    </svg>
  )
}

// 변동 수치: ▲3 / ▼2 (0 이면 아무것도 그리지 않음)
export function Trend({ delta, className }) {
  if (!delta) return null
  return (
    <span
      className={cx('inline-flex items-center gap-1 font-bold', delta > 0 ? 'text-success' : 'text-dim', className)}
    >
      <TrendIcon up={delta > 0} />
      {Math.abs(delta)}
      <span className="sr-only">{delta > 0 ? '상승' : '하락'}</span>
    </span>
  )
}

// ── 로딩, 빈 화면 ─────────────────────────────
// 불러오는 동안 보여줄 회색 자리표시 (lines 줄 수만큼, inCard 면 카드 안의 목록 줄 모양)
export function Skeleton({ lines = 3, inCard, className }) {
  return (
    <div className={cx('mt-4 flex flex-col gap-3', className)} role="status" aria-label="불러오는 중">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cx(
            'flex items-center gap-3 motion-safe:animate-shimmer',
            !inCard && 'rounded-xl border border-line bg-surface p-4',
          )}
        >
          <span className={cx('flex-none rounded-full bg-surface-2', inCard ? 'size-8' : 'size-12')} />
          <span className="flex-1">
            <span className="block h-4 w-2/5 rounded-sm bg-surface-2" />
            <span className="mt-2 block h-3 w-3/5 rounded-sm bg-surface-2" />
          </span>
        </div>
      ))}
    </div>
  )
}

// 빈 화면 안내: 그림 + 제목 + 설명 (+ 선택 버튼)
export function EmptyState({ art, title, children, className }) {
  return (
    <div className={cx('flex flex-col items-center py-4 text-center', className)}>
      <div className="w-24 text-dot [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">{art}</div>
      <strong className="mt-4 text-base font-bold">{title}</strong>
      {children && <Sub className="mt-2">{children}</Sub>}
    </div>
  )
}
