import { t } from '../lib/i18n.js'
import { useState } from 'react'
import { Modal, ModalText, ModalTitle, cx, ChevronIcon } from './ui.jsx'

const ONB_BTN = 'rounded-md border px-6 py-3 text-sm font-bold active:scale-[.97]'

// 가입 완료 후 첫 진입 시 1회 보여주는 기능 소개 팝업
// 그림은 선 아이콘. 상자 폭(약 280px)에 맞춰 커지므로 선 두께를 0.9 로 두어 화면에서는 약 3px 로 보임
const SLIDES = [
  {
    title: t('매일 운동 시작'),
    desc: t('Day 1~30 영상으로 매일 운동하고 streak을 쌓아요. 영상을 끝까지 보면 자동으로 완료 처리돼요.'),
    art: (
      <svg
        viewBox="0 0 84 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="76" height="40" rx="6" />
        <circle cx="42" cy="24" r="10" />
        <path d="M39 19.5 47.5 24 39 28.5Z" />
        <path d="M10 50h30" />
      </svg>
    ),
  },
  {
    title: t('그룹으로 함께'),
    desc: t('초대 코드로 친구들과 그룹을 만들고, 서로의 운동 현황을 매일 확인하며 함께 꾸준해져요.'),
    art: (
      <svg
        viewBox="0 0 84 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="76" height="48" rx="6" />
        <circle cx="16" cy="16" r="5" />
        <path d="M26 16h34" />
        <circle cx="16" cy="30" r="5" />
        <path d="M26 30h26" />
        <circle cx="16" cy="44" r="5" />
        <path d="M26 44h30" />
      </svg>
    ),
  },
  {
    title: t('인증샷 공유'),
    desc: t("운동 완료 후 인증샷을 올리면 그룹의 '오늘의 인증샷'에 공유돼요. 프로필 사진도 꾸며보세요."),
    art: (
      <svg
        viewBox="0 0 84 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="22" height="20" rx="4" />
        <rect x="31" y="6" width="22" height="20" rx="4" />
        <rect x="56" y="6" width="22" height="20" rx="4" />
        <rect x="6" y="30" width="22" height="20" rx="4" />
        <rect x="31" y="30" width="22" height="20" rx="4" />
        <circle cx="17" cy="16" r="4" />
      </svg>
    ),
  },
]

export default function OnboardingModal({ onClose }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  return (
    <Modal label={t('ABSolid 기능 소개')}>
      {/* 진행 표시: 팝업 맨 위, 둥근 직사각형 막대 (현재 항목은 넓고 브랜드 색) */}
      <div className="mb-4 flex justify-center gap-2" aria-label={`${i + 1} / ${SLIDES.length}`}>
        {SLIDES.map((_, d) => (
          <i key={d} className={cx('h-1.5 rounded-sm transition-all', d === i ? 'w-6 bg-brand' : 'w-3 bg-dot')} />
        ))}
      </div>
      <ModalTitle>{t('환영해요!')}</ModalTitle>
      <ModalText>{t('ABSolid에서 이런 걸 할 수 있어요')}</ModalText>

      <div className="mt-5 rounded-lg border border-line bg-bg px-7 py-5 text-dim [&>svg]:block [&>svg]:h-auto [&>svg]:w-full">
        {slide.art}
      </div>
      <strong className="mt-4 block text-center text-base font-bold">{slide.title}</strong>
      <p className="mt-2 min-h-10 text-center text-sm text-dim">{slide.desc}</p>

      {/* 하단(엄지 영역): 왼쪽 '이전'은 보조 동작이라 테두리 없는 글자 버튼, 오른쪽 '다음, 확인'이 주요 동작 */}
      <div className="mt-5 flex items-center justify-between">
        <button
          className={cx(
            'flex items-center gap-1 rounded-md py-3 pr-4 pl-2 text-sm font-bold text-dim active:scale-[.97]',
            i === 0 && 'invisible', // 첫 장에선 숨기되 자리는 유지 (버튼 위치가 흔들리지 않게)
          )}
          onClick={() => setI(i - 1)}
          disabled={i === 0}
          aria-label={t('이전 소개 보기')}
        >
          <ChevronIcon left className="size-4" />
          {t('이전')}
        </button>
        {last ? (
          <button className={cx(ONB_BTN, 'border-brand-strong bg-brand-strong text-white')} onClick={onClose}>
            {t('확인')}
          </button>
        ) : (
          <button className={cx(ONB_BTN, 'border-line bg-surface-2 text-fg')} onClick={() => setI(i + 1)}>
            {t('다음')}
          </button>
        )}
      </div>
    </Modal>
  )
}
