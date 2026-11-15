// 소개 페이지의 움직임 도구 — 스크롤 진행도, 등장, 숫자 올라가기, 마우스 기울기
// 움직임 줄이기 설정을 켠 사람에게는 위치가 바뀌는 움직임을 보여 주지 않음
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../components/ui.jsx'

export const reduceMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const clamp01 = (n) => Math.min(1, Math.max(0, n))

// 요소가 화면을 지나가는 정도를 0~1 로 계산
//   through: 요소 윗변이 화면 아래에 닿을 때 0, 요소 아랫변이 화면 위로 빠질 때 1 (지나가는 내내 움직이는 연출)
//   enter:   요소 윗변이 화면 아래에 닿을 때 0, 화면 맨 위에 닿을 때 1 (들어오는 동안만 움직이는 연출)
//   pin:     요소 윗변이 화면 맨 위에 닿을 때 0, 아랫변이 화면 아래에 닿을 때 1 (화면에 고정해 두는 긴 구간)
export function scrollProgress({ top, height }, viewport, mode = 'through') {
  if (!viewport) return 0
  if (mode === 'pin') return height <= viewport ? 0 : clamp01(-top / (height - viewport))
  if (mode === 'enter') return clamp01((viewport - top) / viewport)
  return clamp01((viewport - top) / (viewport + height))
}

// 스크롤 이벤트 하나를 여러 구간이 나눠 씀 (화면을 그리기 직전에 한 번만 계산)
const listeners = new Set()
let scheduled = false
function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    listeners.forEach((fn) => fn())
  })
}
function subscribe(fn) {
  if (!listeners.size) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
  }
  listeners.add(fn)
  fn()
  return () => {
    listeners.delete(fn)
    if (!listeners.size) {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }
}

// ref 요소의 스크롤 진행도를 CSS 변수 --p (0~1) 로 넣어 줌. CSS 가 calc(var(--p) ...) 로 움직임을 만듦
// onChange 를 넘기면 값이 바뀔 때마다 불러 줌 (지금 몇 번째 단계인지 계산할 때)
export function useScrollProgress(mode = 'through', onChange) {
  const ref = useRef(null)
  const handler = useRef(onChange)
  handler.current = onChange
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let last = -1
    return subscribe(() => {
      const p = scrollProgress(el.getBoundingClientRect(), window.innerHeight, mode)
      if (Math.abs(p - last) < 0.0005) return
      last = p
      el.style.setProperty('--p', p.toFixed(4))
      handler.current?.(p)
    })
  }, [mode])
  return ref
}

// 화면에 들어왔는지 (한 번 들어오면 계속 true)
// eager: 화면에 들어오기를 기다리지 않고 바로 true (첫 화면의 글처럼 처음부터 보여야 하는 것)
export function useInView(threshold = 0.2, eager = false) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (eager || !('IntersectionObserver' in window)) {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [seen, threshold, eager])
  return [ref, seen]
}

// 화면에 들어오면 아래에서 떠오르며 나타남. delay(ms) 로 형제끼리 시차를 줌
// eager: 페이지가 열리자마자 나타남 (첫 화면용. 화면 감지가 늦어도 글이 안 보이는 일이 없게)
export function Reveal({ as: Tag = 'div', delay = 0, eager = false, className, children, ...props }) {
  const [ref, seen] = useInView(0.2, eager)
  return (
    <Tag
      ref={ref}
      data-seen={seen}
      style={{ transitionDelay: `${delay}ms` }}
      className={cx(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        seen ? 'opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

// 화면에 들어오면 0 에서 to 까지 올라가는 숫자
export function CountUp({ to, duration = 1100 }) {
  const [ref, seen] = useInView(0.6)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (reduceMotion()) {
      setN(to)
      return
    }
    let id
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - t, 3)))) // 끝으로 갈수록 느려짐
      if (t < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [seen, to, duration])
  return (
    <span ref={ref} className="tabular-nums">
      {n}
    </span>
  )
}

// 마우스를 따라 살짝 기울이기: 요소에 CSS 변수 --tx, --ty (-1~1) 를 넣어 줌
// 마우스가 있는 기기에서만, 움직임 줄이기 설정이 꺼져 있을 때만 동작
export function useTilt() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion() || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return
    const move = (e) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--tx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
      el.style.setProperty('--ty', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
    }
    const leave = () => {
      el.style.setProperty('--tx', '0')
      el.style.setProperty('--ty', '0')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])
  return ref
}
