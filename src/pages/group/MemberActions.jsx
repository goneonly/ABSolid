// 멤버 줄의 '더보기'를 누르면 뜨는 선택지
// - 누구나: 차단하기 (나만 안 보이게, 상대에게 알리지 않음)
// - 그룹장만: 그룹에서 내보내기, 내보내고 다시 못 들어오게 막기
import { t } from '../../lib/i18n.js'
import { Button, Modal, ModalText, ModalTitle } from '../../components/ui.jsx'

export default function MemberActions({ member, isOwner, busy, onBlock, onKick, onClose }) {
  return (
    <Modal label={t('{name}님 관리', { name: member.name })} onBackdrop={onClose}>
      <ModalTitle>{t('{name}님', { name: member.name })}</ModalTitle>
      <ModalText>
        {isOwner
          ? t('그룹장은 멤버를 그룹에서 내보낼 수 있어요.')
          : t('차단하면 이 멤버의 기록과 인증샷이 나에게 보이지 않아요.')}
      </ModalText>
      <Button variant="secondary" className="mt-5" disabled={busy} onClick={onBlock}>
        {t('차단하기')}
      </Button>
      {isOwner && (
        <>
          <Button variant="danger" className="mt-3" disabled={busy} onClick={() => onKick(false)}>
            {t('그룹에서 내보내기')}
          </Button>
          <Button variant="danger" className="mt-3" disabled={busy} onClick={() => onKick(true)}>
            {t('내보내고 다시 못 들어오게 하기')}
          </Button>
        </>
      )}
      <Button variant="secondary" className="mt-3" onClick={onClose}>
        {t('취소')}
      </Button>
    </Modal>
  )
}
