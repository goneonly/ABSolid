// 멤버 한 줄: 프로필 사진 · 이름 · 최근 7일 운동 여부 · 응원/차단 버튼
import { todayKey, lastNDays } from '../../storage.js'
import { MemberAvatar, cx } from '../../components/ui.jsx'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

// cheer: { count, sent, busy, onCheer } — 로그인 상태의 그룹 화면에서만 전달
// onBlock: 다른 멤버 행에서만 전달 (차단하기)
export default function MemberRow({ name, isMe, dates, avatar, cheer, onBlock }) {
  const days = lastNDays(7, {})
  const doneToday = dates.has(todayKey())
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <MemberAvatar name={name} avatar={avatar} active={doneToday} className="mt-0.5" />
      <div className="flex-1">
        <span className="text-md font-semibold">
          {name}
          {isMe ? ' (나)' : ''}
        </span>
        <div className="mt-1.5 flex gap-1.5">
          {days.map((d) => (
            <div key={d.key} className="text-center">
              <div className={cx('size-4 rounded-full', dates.has(d.key) ? 'bg-brand' : 'bg-dot')} />
              <div className="mt-0.5 text-2xs text-dim">{WEEK[d.date.getDay()]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className={cx('text-xs', doneToday ? 'font-semibold text-brand' : 'text-dim')}>
          {doneToday ? '오늘 완료' : '아직'}
        </span>
        {cheer &&
          (isMe ? (
            cheer.count > 0 && <span className="text-2xs text-dim">응원 {cheer.count}개 받음</span>
          ) : (
            <button
              className={cx(
                'rounded-full border px-2.5 py-1 text-2xs font-semibold disabled:opacity-60',
                cheer.sent ? 'border-line bg-surface-2 text-dim' : 'border-brand/40 bg-brand/15 text-brand',
              )}
              disabled={cheer.sent || cheer.busy}
              onClick={cheer.onCheer}
              aria-label={`${name}님 응원하기`}
            >
              {cheer.sent ? '✓ 응원함' : doneToday ? '잘했어요' : '힘내요'}
              {cheer.count > 0 && <span className="ml-1 opacity-70">{cheer.count}</span>}
            </button>
          ))}
        {onBlock && (
          <button className="text-2xs text-dim underline" onClick={onBlock} aria-label={`${name}님 차단하기`}>
            차단
          </button>
        )}
      </div>
    </div>
  )
}
