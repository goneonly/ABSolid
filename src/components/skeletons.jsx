// 스켈레톤 화면: 불러오는 동안 실제 화면과 같은 자리, 같은 크기에 빈 블록을 먼저 놓아 둠
// 데이터가 들어와도 화면이 밀리지 않게, 각 블록은 실제 부품과 같은 여백, 글자 크기 클래스를 그대로 씀
// 실제 부품을 고치면 여기 짝도 함께 고쳐 주세요 (파일마다 어느 부품의 짝인지 적어 둠)
import { t } from '../lib/i18n.js'
import { Card, cx } from './ui.jsx'

// 빈 블록 색: 테두리 색(라이트 #e2e4e9, 다크 #2e3138)이라 흰 카드, 검은 카드 위 모두에서 또렷함. 반짝임은 블록에만 (카드는 그대로)
const BONE = 'bg-line motion-safe:animate-shimmer'

// 글자 한 줄 자리: 실제 글자와 같은 크기 클래스(size)를 써서 줄 높이를 똑같이 맞추고, 가운데에 회색 막대
function Line({ size = 'text-sm', className }) {
  return (
    <span className={cx('relative block', size, className)}>
      {' '}
      <span className={cx('absolute inset-x-0 inset-y-[22%] rounded-sm', BONE)} />
    </span>
  )
}

// 알약 모양 버튼 자리 (응원, 차단 해제, 기간 버튼). 실제 버튼과 같은 여백 클래스
function Pill({ className }) {
  return (
    <span className={cx('block flex-none rounded-full border border-transparent px-3 text-xs', BONE, className)}>
      {' '}
    </span>
  )
}

// 화면 낭독기에는 '불러오는 중' 한 번만 알리고, 안의 블록은 읽지 않음
function Loading({ className, children }) {
  return (
    <div role="status" aria-label={t('불러오는 중')}>
      <div className={className} aria-hidden="true">
        {children}
      </div>
    </div>
  )
}

// 카드 제목 자리 (ui.jsx 의 CardTitle). 불러오는 동안에는 글자 대신 빈 블록
export function TitleSkeleton({ className }) {
  return <Line size="text-base" className={cx('w-24', className)} />
}

const repeat = (count, render) => Array.from({ length: count }, (_, i) => render(i))

// 그룹 목록 카드 (pages/Group.jsx 의 그룹 버튼)
export function GroupListSkeleton({ count = 2 }) {
  return (
    <Loading className="mt-4 flex flex-col gap-3">
      {repeat(count, (i) => (
        <div key={i} className="flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4">
          <span className={cx('size-12 flex-none rounded-full', BONE)} />
          <div className="min-w-0 flex-1">
            <Line size="text-base" className="w-2/5" />
            <Line size="text-xs" className="mt-1 w-1/4" />
          </div>
          <span className="size-5 flex-none" />
        </div>
      ))}
    </Loading>
  )
}

// 멤버 한 줄 (pages/group/MemberRow.jsx): 이름과 상태, 최근 7일 점, 응원과 더보기
export function MemberListSkeleton({ count = 3 }) {
  return (
    <Loading className="mt-2">
      {repeat(count, (i) => (
        <div key={i} className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
          <span className={cx('mt-1 size-8 flex-none rounded-full', BONE)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Line size="text-base" className="w-24" />
              <Line size="text-xs" className="w-10" />
            </div>
            <div className="mt-2 flex gap-2">
              {repeat(7, (d) => (
                <div key={d}>
                  <div className={cx('size-4 rounded-full', BONE)} />
                  <Line size="text-xs" className="mt-1 w-4" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Pill className="w-16 py-1" />
              <Line size="text-xs" className="w-10" />
            </div>
          </div>
        </div>
      ))}
    </Loading>
  )
}

// 내 순위 상자와 순위 줄 (components/RankBoard.jsx)
export function RankRowsSkeleton({ count = 3 }) {
  return (
    <Loading>
      <div className="mt-3 rounded-md border border-line px-4 py-3">
        <Line size="text-base" className="w-1/2" />
      </div>
      <div className="mt-1">
        {repeat(count, (i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
            <span className="w-6 flex-none">
              <Line size="text-sm" className="mx-auto w-3" />
            </span>
            <span className={cx('size-8 flex-none rounded-full', BONE)} />
            <div className="min-w-0 flex-1">
              <Line size="text-sm" className="w-2/5" />
              <div className={cx('mt-2 h-1 rounded-full', BONE)} />
            </div>
            <span className="w-8 flex-none">
              <Line size="text-xs" className="ml-auto w-4" />
            </span>
            <span className="w-10 flex-none">
              <Line size="text-sm" className="ml-auto w-7" />
            </span>
          </div>
        ))}
      </div>
    </Loading>
  )
}

// 리더보드 카드 전체 (components/Leaderboard.jsx): 제목과 기간, 기간 버튼, 순위
export function LeaderboardSkeleton({ count = 3 }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <TitleSkeleton />
        <Line size="text-xs" className="w-20" />
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden" aria-hidden="true">
        {['w-14', 'w-14', 'w-18', 'w-16'].map((w, i) => (
          <Pill key={i} className={cx('py-2', w)} />
        ))}
      </div>
      <RankRowsSkeleton count={count} />
    </Card>
  )
}

// 오늘의 인증샷 격자 (pages/group/GroupDetail.jsx): 정사각형 사진, 이름, 신고와 차단
export function PhotoGridSkeleton({ count = 3 }) {
  return (
    <Loading className="mt-4 grid grid-cols-3 gap-2">
      {repeat(count, (i) => (
        <div key={i}>
          <span className={cx('block aspect-square w-full rounded-md border border-transparent', BONE)} />
          <Line size="text-xs" className="mx-auto mt-1 w-1/2" />
          <Line size="text-xs" className="mx-auto mt-1 w-2/3" />
        </div>
      ))}
    </Loading>
  )
}

// 이름표와 입력칸 (components/ui.jsx 의 Field). 첫 칸은 mt-3, 다음 칸부터 mt-4
export function FieldsSkeleton({ count = 2 }) {
  return (
    <Loading>
      {repeat(count, (i) => (
        <div key={i} className={i === 0 ? 'mt-3' : 'mt-4'}>
          <Line size="text-sm" className="mb-2 w-16" />
          <span className={cx('block rounded-md border border-transparent px-4 py-3 text-base', BONE)}>{' '}</span>
        </div>
      ))}
    </Loading>
  )
}

// 차단한 사용자 한 줄 (pages/settings/BlockedUsersModal.jsx): 닉네임, 차단 해제 버튼
export function BlockedListSkeleton({ count = 2 }) {
  return (
    <Loading className="mt-3">
      {repeat(count, (i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
          <Line size="text-sm" className="w-24" />
          <Pill className="w-18 py-1" />
        </div>
      ))}
    </Loading>
  )
}
