// 개인정보 처리방침, 이용약관 창 — 본문은 화면 언어에 맞게 legal/ko.jsx(원본) 또는 legal/en.jsx(번역)
// 내용을 바꾸면 두 파일을 함께 고치고 src/lib/terms.js 의 TERMS_VERSION(시행일)도 바꿔 주세요
import { currentLanguage, t } from '../lib/i18n.js'
import * as en from './legal/en.jsx'
import * as ko from './legal/ko.jsx'
import { Button, Modal, ModalTitle } from './ui.jsx'

const BODY =
  'mt-4 text-sm text-dim [&_li]:mt-1 [&_strong]:mt-4 [&_strong]:block [&_strong]:text-fg [&_ul]:mt-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:mt-2 [&_ol]:ml-5 [&_ol]:list-decimal [&>p]:mt-2 [&_a]:text-fg [&_a]:underline'

const docs = () => (currentLanguage() === 'en' ? en : ko)

function LegalModal({ title, onClose, children }) {
  return (
    <Modal label={title} onBackdrop={onClose} className="max-h-[85dvh] overflow-y-auto">
      <ModalTitle>{title}</ModalTitle>
      <div className={BODY}>{children}</div>
      <Button variant="secondary" className="mt-5" onClick={onClose}>
        {t('닫기')}
      </Button>
    </Modal>
  )
}

// ── 개인정보 처리방침 (개인정보 보호법 제30조 기재 항목) ──
export function PrivacyModal({ onClose, title = t('개인정보 처리방침') }) {
  const { PrivacyBody } = docs()
  return (
    <LegalModal title={title} onClose={onClose}>
      <PrivacyBody />
    </LegalModal>
  )
}

// ── 이용약관 ──
export function TermsModal({ onClose }) {
  const { TermsBody } = docs()
  return (
    <LegalModal title={t('이용약관')} onClose={onClose}>
      <TermsBody />
    </LegalModal>
  )
}
