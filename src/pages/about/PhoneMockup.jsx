// 휴대폰 틀 안에 실제 앱 화면을 끼워 보여 주는 부품
// 틀 이미지는 화면 자리가 투명하게 뚫려 있고, 그 아래에 앱 화면을 깔아 둠
//
// 목업 사진을 바꾸려면: python3 scripts/make-phone-frame.py <새 사진> 을 돌리고, 출력된 숫자를 FRAME 에 옮김
import { useLayoutEffect, useRef, useState } from 'react'
import { cx } from '../../components/ui.jsx'

const FRAME = {
  src: '/about/phone-frame.webp',
  ratio: 0.48775, // 틀 가로 / 세로
  screen: { left: 4.452, top: 1.837, width: 91.096, height: 96.325 }, // 틀 대비 %
  screenRatio: 0.46127, // 화면 가로 / 세로
  radius: 16.416, // 화면 모서리 둥글기 (화면 가로 대비 %)
}

// 앱 화면을 그리는 기준 크기 (px). 실제 아이폰 화면 폭과 같게 두고, 틀 크기에 맞춰 통째로 줄이거나 키움
export const SCREEN_WIDTH = 393
export const SCREEN_HEIGHT = Math.round(SCREEN_WIDTH / FRAME.screenRatio)
// 틀 가로 / 세로. 높이를 기준으로 폭을 정할 때 씀: w-[calc(60svh*var(--phone-ratio))]
export const PHONE_RATIO = FRAME.ratio

// theme: 화면 안쪽만의 테마 ('dark' | 'light'). 페이지 테마와 상관없이 정할 수 있음
// className 으로 폭을 정하면 높이는 틀 비율대로 따라감
export default function PhoneMockup({ theme = 'dark', className, children }) {
  const screenRef = useRef(null)
  const [scale, setScale] = useState(0)

  // 화면 자리의 실제 폭에 맞춰 앱 화면 배율을 정함
  useLayoutEffect(() => {
    const el = screenRef.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / SCREEN_WIDTH)
    measure()
    if (!('ResizeObserver' in window)) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { screen } = FRAME
  return (
    <div className={cx('relative flex-none', className)} style={{ aspectRatio: FRAME.ratio }}>
      <div
        ref={screenRef}
        data-theme={theme}
        className="absolute overflow-hidden bg-bg text-fg"
        style={{
          left: `${screen.left}%`,
          top: `${screen.top}%`,
          width: `${screen.width}%`,
          height: `${screen.height}%`,
          borderRadius: `${FRAME.radius}% / ${FRAME.radius * FRAME.screenRatio}%`,
        }}
      >
        {/* transform 이 걸린 요소 안에서는 fixed 가 이 요소 기준이 되어, 앱의 아래 메뉴와 모달이 화면 안에 그대로 놓임 */}
        <div
          className="origin-top-left"
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            transform: `scale(${scale})`,
            visibility: scale ? 'visible' : 'hidden',
          }}
        >
          {children}
        </div>
      </div>
      <img
        className="pointer-events-none absolute inset-0 size-full select-none"
        src={FRAME.src}
        alt=""
        draggable={false}
      />
    </div>
  )
}
