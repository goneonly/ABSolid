import { useEffect, useRef, useState } from 'react'
import { Button, CheckIcon, Modal, ModalTitle } from './ui.jsx'
import { compressImage } from '../lib/image.js'
import { cheerMessage } from '../lib/stats.js'

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// from 에서 to 로 숫자가 올라가는 애니메이션 (움직임 줄이기 설정이면 바로 최종값)
function CountUp({ from, to }) {
  const [n, setN] = useState(from)
  useEffect(() => {
    if (from === to || reduceMotion()) {
      const id = requestAnimationFrame(() => setN(to))
      return () => cancelAnimationFrame(id)
    }
    let id
    const start = performance.now() + 350 // 체크 표시가 튀어나온 뒤 시작
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / 600))
      setN(Math.round(from + (to - from) * t))
      if (t < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [from, to])
  return n
}

export default function CompleteModal({ day, streak, busy, onSave, onSkip }) {
  const fileRef = useRef(null)
  const [photo, setPhoto] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await compressImage(file))
    } catch {
      /* 무시 */
    }
  }

  return (
    <Modal label={`Day ${day} 운동 완료`}>
      {/* 축하: 빛나는 체크 + 연속 기록 숫자 올라가기 + 문구 */}
      <div className="relative mx-auto size-16" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-brand blur-xl motion-safe:animate-glow" />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-brand text-white motion-safe:animate-pop">
          <CheckIcon className="size-8" />
        </span>
      </div>
      <ModalTitle className="mt-4">Day {day} 운동 완료!</ModalTitle>
      <p className="mt-2 text-center text-sm text-dim">
        연속{' '}
        <strong className="inline-block text-xl font-extrabold text-brand tabular-nums motion-safe:animate-pop">
          <CountUp from={streak.from} to={streak.to} />
        </strong>
        일째, {cheerMessage(day, streak.to)}
      </p>

      <button
        className="mt-6 flex min-h-40 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-surface-2 text-center text-base font-bold text-dim"
        onClick={() => fileRef.current?.click()}
      >
        {photo ? <img className="block w-full" src={photo} alt="인증샷 미리보기" /> : '탭하여 인증샷 첨부 (선택)'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

      <Button className="mt-5" disabled={busy} onClick={() => onSave(photo)}>
        {busy ? '기록하는 중…' : photo ? '사진과 함께 업로드' : '완료 기록하기'}
      </Button>
      <Button variant="secondary" className="mt-3" disabled={busy} onClick={onSkip}>
        사진 없이 완료
      </Button>
    </Modal>
  )
}
