// 그룹 목록 아래의 카드: 초대 코드로 참여 / 새 그룹 만들기
import { t } from '../../lib/i18n.js'
import { useState } from 'react'
import { getProfile } from '../../lib/storage.js'
import { createGroup, joinGroup } from '../../server/api.js'
import { toast } from '../../lib/toast.js'
import { Button, Card, Input, Sub, cx } from '../../components/ui.jsx'

const MODES = [
  { key: 'join', label: t('코드로 참여') },
  { key: 'create', label: t('그룹 만들기') },
]
const OPTION_ROW = 'flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-b-0'

export default function JoinCreateCard({ onDone }) {
  const [mode, setMode] = useState('join') // join | create
  const [input, setInput] = useState('')
  const [maxMembers, setMaxMembers] = useState('10')
  const [membersOnly, setMembersOnly] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const limit = Number(maxMembers)
    if (mode === 'create' && !(limit >= 2 && limit <= 50)) {
      setError(t('인원수는 2~50명 사이로 입력해 주세요.'))
      return
    }
    setBusy(true)
    try {
      const nickname = getProfile().nickname
      const g =
        mode === 'create'
          ? await createGroup(input.trim(), nickname, { maxMembers: limit, membersOnly })
          : await joinGroup(input, nickname)
      setInput('')
      toast(
        mode === 'create'
          ? t("'{name}' 그룹을 만들었어요.", { name: g.name })
          : t("'{name}' 그룹에 참여했어요.", { name: g.name }),
      )
      await onDone(g)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  return (
    <Card>
      {/* 참여, 만들기 전환 (설정의 화면 테마 고르기와 같은 모양. 좁은 폰에서도 한 줄) */}
      <div
        className="mb-3 flex gap-1 rounded-md bg-surface-2 p-1"
        role="tablist"
        aria-label={t('그룹 참여 또는 만들기')}
      >
        {MODES.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={mode === m.key}
            className={cx(
              'flex-1 rounded-sm py-3 text-sm font-bold whitespace-nowrap transition-colors',
              mode === m.key ? 'bg-surface text-fg shadow-sm' : 'text-dim',
            )}
            onClick={() => {
              setMode(m.key)
              setError('')
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === 'join' ? t('초대 코드 6자리') : t('그룹 이름 (예: 중앙대학교)')}
        maxLength={mode === 'join' ? 6 : 20}
        className={mode === 'join' ? 'tracking-widest uppercase placeholder:tracking-normal' : undefined}
      />
      {mode === 'create' && (
        <div className="mt-3 border-t border-line">
          <div className={OPTION_ROW}>
            <label htmlFor="max-members">{t('인원수 제한')}</label>
            <span className="flex items-center gap-2 text-dim">
              <Input
                id="max-members"
                className="w-16 px-3 py-2 text-center text-sm"
                type="text"
                inputMode="numeric"
                value={maxMembers}
                placeholder="2~50"
                maxLength={2}
                onChange={(e) => {
                  setMaxMembers(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
              />
              {t('인원|명')}
            </span>
          </div>
          <label className={cx(OPTION_ROW, 'cursor-pointer')}>
            <span className="flex flex-col gap-1">
              {t('회원만 받기')}
              <small className="text-xs text-dim">{t('이름과 전화번호를 등록한 회원만 참여할 수 있어요')}</small>
            </span>
            <input
              type="checkbox"
              className="size-4.5 flex-none accent-brand"
              checked={membersOnly}
              onChange={(e) => setMembersOnly(e.target.checked)}
            />
          </label>
        </div>
      )}
      {error && <Sub className="mt-2 text-danger">{error}</Sub>}
      <Button className="mt-3" onClick={submit} disabled={busy || !input.trim()}>
        {busy ? t('처리 중…') : mode === 'join' ? t('참여하기') : t('만들기')}
      </Button>
    </Card>
  )
}
