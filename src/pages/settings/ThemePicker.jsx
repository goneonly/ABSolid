// 화면 테마 선택 — 세 가지를 한눈에 보이게 펼친 버튼 묶음 (메뉴를 한 번 더 열 필요 없이 바로 선택)
import { useState } from 'react'
import { getThemeMode } from '../../storage.js'
import { THEME_MODES, setThemeMode } from '../../theme.js'
import { CardTitle, Sub, cx } from '../../components/ui.jsx'

export default function ThemePicker() {
  const [mode, setMode] = useState(getThemeMode)

  function choose(next) {
    setMode(next)
    setThemeMode(next)
  }

  return (
    <>
      <CardTitle>화면 테마</CardTitle>
      <Sub className="mt-1">기본은 다크예요. 시스템을 고르면 휴대폰의 라이트·다크 설정을 따라가요.</Sub>
      <div className="mt-3 flex gap-1 rounded-md bg-surface-2 p-1" role="radiogroup" aria-label="화면 테마">
        {THEME_MODES.map((m) => (
          <button
            key={m.key}
            role="radio"
            aria-checked={mode === m.key}
            className={cx(
              'flex-1 rounded-sm py-3 text-sm font-bold transition-colors',
              mode === m.key ? 'bg-surface text-fg shadow-sm' : 'text-dim',
            )}
            onClick={() => choose(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </>
  )
}
