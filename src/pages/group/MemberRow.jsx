// 멤버 한 줄: 프로필 사진, 이름, 최근 7일 운동 여부, 응원 버튼, 더보기(차단, 그룹장의 내보내기)
// 좁은 폰(폭 320px)에서도 글자가 세로로 쪼개지지 않게, 오른쪽 칸을 따로 두지 않고 세 줄로 쌓음
//   1줄: 이름 ............ 오늘 완료 / 아직
//   2줄: 최근 7일 점
//   3줄: 응원 버튼, 받은 응원 수 ....... 더보기
import { t, weekdayShort } from '../../lib/i18n.js'
import { todayKey, lastNDays } from '../../lib/storage.js'
import { CheckIcon, MemberAvatar, cx } from '../../components/ui.jsx'

// cheer: { count, sent, busy, onCheer } — 로그인 상태의 그룹 화면에서만 전달
// onMore: 다른 멤버 행에서만 전달 (더보기: 차단, 그룹장이면 내보내기)
export default function MemberRow({ name, isMe, dates, avatar, cheer, onMore }) {
  const days = lastNDays(7, {})
  const doneToday = dates.has(todayKey())
  const showActions = (cheer && (!isMe || cheer.count > 0)) || onMore
  return (
    <div className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <MemberAvatar name={name} avatar={avatar} active={doneToday} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-base font-bold">
            {name}
            {isMe ? t(' (나)') : ''}
          </span>
          <span className={cx('flex-none text-xs whitespace-nowrap', doneToday ? 'font-bold text-brand' : 'text-dim')}>
            {doneToday ? t('오늘 완료') : t('아직')}
          </span>
        </div>

        <div className="mt-2 flex gap-2">
          {days.map((d) => (
            <div key={d.key} className="text-center">
              <div className={cx('size-4 rounded-full', dates.has(d.key) ? 'bg-brand' : 'bg-dot')} />
              <div className="mt-1 text-xs text-dim">{weekdayShort(d.date.getDay())}</div>
            </div>
          ))}
        </div>

        {showActions && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              {cheer &&
                (isMe ? (
                  <span className="text-xs whitespace-nowrap text-dim">
                    {t('응원 {count}개 받음', { count: cheer.count })}
                  </span>
                ) : (
                  <button
                    className={cx(
                      'hit inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold whitespace-nowrap disabled:opacity-60',
                      cheer.sent ? 'text-dim' : 'text-fg',
                    )}
                    disabled={cheer.sent || cheer.busy}
                    onClick={cheer.onCheer}
                    aria-label={t('{name}님 응원하기', { name })}
                  >
                    {cheer.sent ? (
                      <>
                        <CheckIcon className="size-3" />
                        {t('응원함')}
                      </>
                    ) : doneToday ? (
                      t('잘했어요')
                    ) : (
                      t('힘내요')
                    )}
                    {cheer.count > 0 && <span className="ml-1 opacity-70">{cheer.count}</span>}
                  </button>
                ))}
            </span>
            {onMore && (
              <button
                className="hit flex-none text-xs whitespace-nowrap text-dim underline"
                onClick={onMore}
                aria-label={t('{name}님 더보기', { name })}
              >
                {t('더보기')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
