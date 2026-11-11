import { useState } from 'react'
import { Modal, ModalText, ModalTitle, cx } from './ui.jsx'

const ONB_BTN = 'rounded-md border px-6 py-3 text-sm font-bold active:scale-[.97]'

// 가입 완료 후 첫 진입 시 1회 보여주는 기능 소개 팝업
const SLIDES = [
  {
    title: '매일 운동 시작',
    desc: 'Day 1~30 영상으로 매일 운동하고 streak을 쌓아요. 영상을 끝까지 보면 자동으로 완료 처리돼요.',
    art: (
      <svg viewBox="0 0 84 56" aria-hidden="true">
        <rect x="4" y="4" width="76" height="40" rx="6" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <circle cx="42" cy="24" r="10" fill="var(--color-brand)" />
        <path d="M39 19.5 L48 24 L39 28.5 Z" fill="#fff" />
        <rect x="10" y="48" width="30" height="4" rx="2" fill="var(--color-dot)" />
      </svg>
    ),
  },
  {
    title: '그룹으로 함께',
    desc: '초대 코드로 친구들과 그룹을 만들고, 서로의 운동 현황을 매일 확인하며 함께 꾸준해져요.',
    art: (
      <svg viewBox="0 0 84 56" aria-hidden="true">
        <rect x="4" y="4" width="76" height="48" rx="6" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <circle cx="16" cy="16" r="6" fill="var(--color-brand)" />
        <rect x="26" y="12" width="34" height="4" rx="2" fill="var(--color-dot)" />
        <circle cx="16" cy="32" r="6" fill="var(--color-dot)" />
        <rect x="26" y="28" width="26" height="4" rx="2" fill="var(--color-dot)" />
        <circle cx="16" cy="46" r="6" fill="var(--color-brand)" />
        <rect x="26" y="44" width="30" height="4" rx="2" fill="var(--color-dot)" />
      </svg>
    ),
  },
  {
    title: '인증샷 공유',
    desc: "운동 완료 후 인증샷을 올리면 그룹의 '오늘의 인증샷'에 공유돼요. 프로필 사진도 꾸며보세요.",
    art: (
      <svg viewBox="0 0 84 56" aria-hidden="true">
        <rect x="6" y="6" width="22" height="22" rx="4" fill="var(--color-brand)" opacity=".85" />
        <rect x="31" y="6" width="22" height="22" rx="4" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <rect x="56" y="6" width="22" height="22" rx="4" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <rect x="6" y="31" width="22" height="22" rx="4" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <circle cx="17" cy="17" r="5" fill="#fff" opacity=".9" />
        <rect x="31" y="31" width="22" height="22" rx="4" fill="var(--color-dot)" opacity=".5" />
      </svg>
    ),
  },
]

export default function OnboardingModal({ onClose }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  return (
    <Modal label="ABSolid 기능 소개">
      {/* 진행 표시: 팝업 맨 위, 둥근 직사각형 막대 (현재 항목은 넓고 브랜드 색) */}
      <div className="mb-4 flex justify-center gap-2" aria-label={`${i + 1} / ${SLIDES.length}`}>
        {SLIDES.map((_, d) => (
          <i key={d} className={cx('h-1.5 rounded-sm transition-all', d === i ? 'w-6 bg-brand' : 'w-3 bg-dot')} />
        ))}
      </div>
      <ModalTitle>환영해요!</ModalTitle>
      <ModalText>ABSolid에서 이런 걸 할 수 있어요</ModalText>

      <div className="mt-5 rounded-lg border border-line bg-bg px-7 py-5 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
        {slide.art}
      </div>
      <strong className="mt-4 block text-center text-base font-bold">{slide.title}</strong>
      <p className="mt-2 min-h-10 text-center text-sm text-dim">{slide.desc}</p>

      {/* 하단(엄지 영역): 왼쪽 '이전'은 보조 동작이라 테두리 없는 글자 버튼, 오른쪽 '다음·확인'이 주요 동작 */}
      <div className="mt-5 flex items-center justify-between">
        <button
          className={cx(
            'flex items-center gap-1 rounded-md py-3 pr-4 pl-2 text-sm font-bold text-dim active:scale-[.97]',
            i === 0 && 'invisible', // 첫 장에선 숨기되 자리는 유지 (버튼 위치가 흔들리지 않게)
          )}
          onClick={() => setI(i - 1)}
          disabled={i === 0}
          aria-label="이전 소개 보기"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
          이전
        </button>
        {last ? (
          <button className={cx(ONB_BTN, 'border-brand-strong bg-brand-strong text-white')} onClick={onClose}>
            확인
          </button>
        ) : (
          <button className={cx(ONB_BTN, 'border-line bg-surface-2 text-fg')} onClick={() => setI(i + 1)}>
            다음
          </button>
        )}
      </div>
    </Modal>
  )
}
