import { t } from '../lib/i18n.js'
import { MemberAvatar, Trend, cx } from './ui.jsx'

// 리더보드의 내 순위와 순위 목록 — 소개 페이지(pages/about/screens.jsx)도 같은 목록을 씀
// rows: [{ id, name, avatar, rank, count, delta }] (lib/stats.js 의 rankRows, withRankDelta 결과)
// totalDays: 기간의 날 수 (막대 길이 기준)
export default function RankBoard({ rows, myId, myName, totalDays }) {
  const me = rows.find((r) => r.id === myId)
  return (
    <>
      {me && (
        <div className="mt-3 rounded-md border border-line px-4 py-3 text-sm">
          {t('내 순위')} <strong className="text-base text-brand">{t('{rank}위', { rank: me.rank })}</strong> ·{' '}
          {t('인증 {count}회', { count: me.count })}
          <Trend delta={me.delta} className="ml-2 text-xs" />
        </div>
      )}

      <div className="mt-1">
        {rows.map((r) => {
          const medal = r.rank <= 3 && r.count > 0
          return (
            <div key={r.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
              <span
                className={cx(
                  'w-6 flex-none text-center font-extrabold tabular-nums',
                  medal ? 'text-base text-brand' : 'text-sm text-dim',
                )}
              >
                {r.rank}
              </span>
              <MemberAvatar name={r.name} avatar={r.avatar} active={r.rank === 1 && r.count > 0} />
              <div className="min-w-0 flex-1">
                <span className={cx('block truncate text-sm font-bold', r.id === myId && 'text-brand')}>
                  {r.id === myId ? myName || r.name : r.name}
                  {r.id === myId ? t(' (나)') : ''}
                </span>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                  <i
                    className="block h-full rounded-full bg-brand transition-[width] duration-300"
                    style={{ width: `${Math.min(100, (r.count / totalDays) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="w-8 flex-none text-right text-xs">
                {r.delta ? <Trend delta={r.delta} /> : <span className="text-dot">—</span>}
              </span>
              <span className="w-10 flex-none text-right text-sm font-extrabold tabular-nums">
                {r.count}
                <span className="ml-px text-xs font-normal text-dim">{t('횟수|회')}</span>
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
