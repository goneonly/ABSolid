// 화면 테마 선택 — 세 가지를 한눈에 보이게 펼친 버튼 묶음 (메뉴를 한 번 더 열 필요 없이 바로 선택)
import { t } from '../../lib/i18n.js'
import { useState } from 'react'
import { getThemeMode } from '../../lib/storage.js'
import { THEME_MODES, setThemeMode } from '../../lib/theme.js'
import { CardTitle, Sub, cx } from '../../components/ui.jsx'

export default function ThemePicker() {
  const [mode, setMode] = useState(getThemeMode)

  function choose(next) {
    setMode(next)
    setThemeMode(next)
  }

  return (
    <>
      <CardTitle>{t('화면 테마')}</CardTitle>
      <div className="mt-3 flex gap-1 rounded-md bg-surface-2 p-1" role="radiogroup" aria-label={t('화면 테마')}>
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
      {/* 시스템을 골랐을 때만 안내. 버튼 아래에 두어 문구가 나타나고 사라져도 버튼 위치는 그대로 */}
      {mode === 'system' && (
        <Sub className="mt-2">{t('시스템을 고르면 휴대폰의 라이트 또는 다크 모드 설정을 따라가요.')}</Sub>
      )}
    </>
  )
}
