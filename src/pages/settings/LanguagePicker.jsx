// 화면 언어 선택 (한국어, 영어) — 테마 고르기와 같은 모양. 고르면 저장하고 앱을 새로 불러와 모든 문구가 바뀜
import { LANGUAGES, currentLanguage, setLanguage, t } from '../../lib/i18n.js'
import { CardTitle, cx } from '../../components/ui.jsx'

export default function LanguagePicker() {
  const lang = currentLanguage()
  return (
    <>
      <CardTitle>{t('언어')}</CardTitle>
      <div className="mt-3 flex gap-1 rounded-md bg-surface-2 p-1" role="radiogroup" aria-label={t('언어')}>
        {LANGUAGES.map((l) => (
          <button
            key={l.key}
            role="radio"
            aria-checked={lang === l.key}
            lang={l.key}
            className={cx(
              'flex-1 rounded-sm py-3 text-sm font-bold transition-colors',
              lang === l.key ? 'bg-surface text-fg shadow-sm' : 'text-dim',
            )}
            onClick={() => lang !== l.key && setLanguage(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </>
  )
}
