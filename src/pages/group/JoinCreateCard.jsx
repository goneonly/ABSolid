// 그룹 목록 아래의 카드: 초대 코드로 참여 / 새 그룹 만들기
import { useState } from 'react'
import { getProfile } from '../../storage.js'
import { createGroup, joinGroup } from '../../api.js'
import { toast } from '../../toast.js'
import { Button, Card, Input, Sub, cx } from '../../components/ui.jsx'

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
      setError('인원수는 2~50명 사이로 입력해 주세요.')
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
      toast(mode === 'create' ? `'${g.name}' 그룹을 만들었어요.` : `'${g.name}' 그룹에 참여했어요.`)
      await onDone(g)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  return (
    <Card>
      <div className="mb-3 flex gap-2">
        <Button
          variant="secondary"
          className={cx('flex-1', mode !== 'join' && 'opacity-50')}
          onClick={() => {
            setMode('join')
            setError('')
          }}
        >
          초대 코드로 참여
        </Button>
        <Button
          variant="secondary"
          className={cx('flex-1', mode !== 'create' && 'opacity-50')}
          onClick={() => {
            setMode('create')
            setError('')
          }}
        >
          그룹 만들기
        </Button>
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === 'join' ? '초대 코드 6자리 (예: AB3K7Q)' : '그룹 이름 (예: 중앙대학교)'}
        maxLength={mode === 'join' ? 6 : 20}
        className={mode === 'join' ? 'uppercase tracking-widest' : undefined}
      />
      {mode === 'create' && (
        <div className="mt-3 border-t border-line">
          <div className={OPTION_ROW}>
            <label htmlFor="max-members">인원수 제한</label>
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
              명
            </span>
          </div>
          <label className={cx(OPTION_ROW, 'cursor-pointer')}>
            <span className="flex flex-col gap-1">
              회원만 받기
              <small className="text-xs text-dim">이름·전화번호를 등록한 회원만 참여할 수 있어요</small>
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
        {busy ? '처리 중…' : mode === 'join' ? '참여하기' : '만들기'}
      </Button>
    </Card>
  )
}
