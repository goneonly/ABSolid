// 멤버 줄의 '더보기'를 누르면 뜨는 선택지
// - 누구나: 차단하기 (나만 안 보이게, 상대에게 알리지 않음)
// - 그룹장만: 그룹에서 내보내기, 내보내고 다시 못 들어오게 막기
import { Button, Modal, ModalText, ModalTitle } from '../../components/ui.jsx'

export default function MemberActions({ member, isOwner, busy, onBlock, onKick, onClose }) {
  return (
    <Modal label={`${member.name}님 관리`} onBackdrop={onClose}>
      <ModalTitle>{member.name}님</ModalTitle>
      <ModalText>
        {isOwner
          ? '그룹장은 멤버를 그룹에서 내보낼 수 있어요.'
          : '차단하면 이 멤버의 기록과 인증샷이 나에게 보이지 않아요.'}
      </ModalText>
      <Button variant="secondary" className="mt-5" disabled={busy} onClick={onBlock}>
        차단하기
      </Button>
      {isOwner && (
        <>
          <Button variant="danger" className="mt-3" disabled={busy} onClick={() => onKick(false)}>
            그룹에서 내보내기
          </Button>
          <Button variant="danger" className="mt-3" disabled={busy} onClick={() => onKick(true)}>
            내보내고 다시 못 들어오게 하기
          </Button>
        </>
      )}
      <Button variant="secondary" className="mt-3" onClick={onClose}>
        취소
      </Button>
    </Modal>
  )
}
