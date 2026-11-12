// 설정의 차단한 사용자 — 목록 확인과 차단 해제
import { useEffect, useState } from 'react'
import { fetchMyBlocks, unblockUser } from '../../server/api.js'
import { toast } from '../../lib/toast.js'
import { Button, Modal, ModalText, ModalTitle, Skeleton, Sub } from '../../components/ui.jsx'

export default function BlockedUsersModal({ onClose }) {
  const [list, setList] = useState(null) // null = 불러오는 중
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let alive = true
    fetchMyBlocks()
      .then((rows) => alive && setList(rows))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  async function unblock(u) {
    if (!confirm(`${u.nickname}님의 차단을 해제할까요?\n그룹 화면에서 다시 보이고, 서로 응원할 수 있어요.`)) return
    setBusyId(u.id)
    try {
      await unblockUser(u.id)
      setList((prev) => prev.filter((x) => x.id !== u.id))
      toast(`${u.nickname}님의 차단을 해제했어요.`)
    } catch (e) {
      toast(e.message)
    }
    setBusyId(null)
  }

  return (
    <Modal label="차단한 사용자" onBackdrop={onClose}>
      <ModalTitle>차단한 사용자</ModalTitle>
      <ModalText>
        차단한 멤버는 그룹 화면과 받은 응원에서 보이지 않고, 서로 응원할 수 없어요. 상대에게는 알리지 않아요.
      </ModalText>
      {error ? (
        <Sub className="mt-4 text-center text-danger">{error}</Sub>
      ) : list === null ? (
        <Skeleton inCard lines={2} />
      ) : list.length === 0 ? (
        <Sub className="mt-4 text-center">차단한 사용자가 없어요.</Sub>
      ) : (
        <div className="mt-3 max-h-72 overflow-y-auto overscroll-contain">
          {list.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
            >
              <span className="truncate text-sm">{u.nickname}</span>
              <button
                className="shrink-0 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold disabled:opacity-60"
                disabled={busyId === u.id}
                onClick={() => unblock(u)}
              >
                {busyId === u.id ? '해제 중…' : '차단 해제'}
              </button>
            </div>
          ))}
        </div>
      )}
      <Button variant="secondary" className="mt-4" onClick={onClose}>
        닫기
      </Button>
    </Modal>
  )
}
