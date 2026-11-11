import { useState } from 'react'
import { getProfile, clearRecords, getRecords, todayKey } from '../storage.js'
import { supabase } from '../supabase.js'
import { signOut, deleteAccount } from '../auth.js'
import { resetServerWorkouts } from '../api.js'
import { isPushConfigured } from '../push.js'
import { toast } from '../toast.js'
import { isStandalone, isIOS, canPromptInstall, promptInstall } from '../install.js'
import { PrivacyModal, TermsModal } from '../components/LegalModals.jsx'
import {
  Banner,
  Button,
  Card,
  CardTitle,
  LinkButton,
  Modal,
  ModalText,
  ModalTitle,
  Page,
  PageTitle,
  RowButton,
  Sub,
} from '../components/ui.jsx'
import ProfilePhoto from './settings/ProfilePhoto.jsx'
import PushToggleRow from './settings/PushToggleRow.jsx'
import PasswordConfirmModal from './settings/PasswordConfirm.jsx'
import { NicknameModal, ProfileInfoModal, ChangePasswordModal } from './settings/ProfileModals.jsx'
import BlockedUsersModal from './settings/BlockedUsersModal.jsx'
import InstallGuideModal from './settings/InstallGuideModal.jsx'
import ThemePicker from './settings/ThemePicker.jsx'

const RESET_WARNING = {
  member: '모든 운동 기록을 삭제할까요? 서버에 저장된 기록과 인증샷도 함께 삭제되며 되돌릴 수 없어요.',
  guest: '이 기기의 운동 기록을 삭제할까요? 되돌릴 수 없어요.',
}

// 기록을 CSV 파일로 내려받기 — 구글시트에서 파일 > 가져오기로 열 수 있음
function downloadRecordsCsv() {
  const records = getRecords()
  const rows = [['날짜', 'Day', '완료 시각', '사진']]
  for (const date of Object.keys(records).sort()) {
    const r = records[date]
    if (r.completed) rows.push([date, r.day || '', r.completedAt || '', r.photoUrl || ''])
  }
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\r\n') // 맨 앞 BOM: 엑셀·시트에서 한글이 깨지지 않게
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `absolid-records-${todayKey()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 바로 해제하면 iOS Safari 에서 다운로드가 취소될 수 있어 잠시 뒤 해제
  setTimeout(() => URL.revokeObjectURL(link.href), 10000)
}

export default function Settings({ session, onChanged, isAdmin, onOpenAdmin, onRequestLogin }) {
  const [nickname, setNickname] = useState(getProfile().nickname)
  // 지금 열려 있는 모달 이름 (한 번에 하나만) — null 이면 닫힘
  // nickname | info | password | blocks | export | reset | delete | install | privacy | terms
  const [modal, setModal] = useState(null)
  const close = () => setModal(null)
  const email = session?.user?.email

  // 홈 화면에 앱 추가: 설치 창을 띄울 수 있으면 바로, 아니면(아이폰 등) 방법 안내
  async function installApp() {
    if (!canPromptInstall()) return setModal('install')
    if (await promptInstall()) toast('홈 화면에 ABSolid를 추가했어요.')
  }

  // 운동 기록 초기화 — 기기 기록을 지우고, 회원이면 서버 기록·인증샷도 삭제
  async function resetRecords() {
    if (!confirm(session ? RESET_WARNING.member : RESET_WARNING.guest)) return
    clearRecords()
    const serverCleared = await resetServerWorkouts() // 비회원은 항상 true
    toast(serverCleared ? '운동 기록을 모두 삭제했어요.' : '서버 기록 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    onChanged()
  }

  // 회원 탈퇴 — 성공하면 로그아웃되면서 이 화면이 새로 그려져 모달도 닫힘
  async function deleteMyAccount() {
    const { error } = await deleteAccount()
    if (error) return error
    toast('계정과 모든 데이터를 삭제했어요. 그동안 함께해 주셔서 고마워요.')
  }

  return (
    <Page>
      <PageTitle>설정</PageTitle>
      <Sub>{session ? `${email} 계정으로 이용 중이에요.` : '비회원 모드예요 (기기 저장)'}</Sub>
      {!session && <GuestNotice />}

      <Card>
        <ProfilePhoto nickname={nickname} session={session} onChanged={onChanged} />
        <CardTitle className="mt-5 mb-2">내 프로필</CardTitle>
        <RowButton hint={nickname?.trim() || '설정 안 됨'} onClick={() => setModal('nickname')}>
          닉네임 변경
        </RowButton>
        {session && (
          <>
            <RowButton hint="그룹 멤버에게는 비공개" onClick={() => setModal('info')}>
              이름·전화번호 변경
            </RowButton>
            <RowButton hint="현재 비밀번호 확인 후 변경" onClick={() => setModal('password')}>
              비밀번호 변경
            </RowButton>
          </>
        )}
        {/* 비회원: 첫 화면(로그인)으로 이동 — 회원가입도 거기서 */}
        {!session && supabase && (
          <Button className="mt-4" onClick={onRequestLogin}>
            로그인하기
          </Button>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <RowButton hint="회원·그룹·신고 관리" onClick={onOpenAdmin}>
            관리자 페이지
          </RowButton>
        </Card>
      )}

      <Card>
        <ThemePicker />
      </Card>

      <Card>
        <CardTitle className="mb-2">기타</CardTitle>
        {!isStandalone() && (
          <RowButton
            hint={isIOS() && isPushConfigured() ? '아이폰 알림 받으려면 필요' : '앱처럼 바로 실행'}
            onClick={installApp}
          >
            홈 화면에 앱 추가
          </RowButton>
        )}
        <PushToggleRow session={session} onNeedInstall={() => setModal('install')} />
        {session && (
          <RowButton hint="그룹에서 숨긴 멤버" onClick={() => setModal('blocks')}>
            차단한 사용자
          </RowButton>
        )}
        <RowButton hint="구글시트에서 열기 가능" onClick={() => setModal('export')}>
          기록 내보내기 (CSV)
        </RowButton>
        {/* 회원은 비밀번호로 본인 확인 후 초기화, 비회원은 비밀번호가 없어 바로 확인 창 */}
        <RowButton
          danger
          hint={session ? '서버 포함 전체 삭제' : '이 기기'}
          onClick={() => (session ? setModal('reset') : resetRecords())}
        >
          운동 기록 초기화
        </RowButton>
        {session && (
          <RowButton danger hint="계정·데이터 영구 삭제" onClick={() => setModal('delete')}>
            회원 탈퇴
          </RowButton>
        )}
      </Card>

      {session && (
        <LinkButton className="mx-auto mt-4 block px-2 py-1 text-sm underline" onClick={() => signOut()}>
          로그아웃
        </LinkButton>
      )}

      <Sub className="mt-4 text-center">ABSolid v{__APP_VERSION__}</Sub>
      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-dim [&>a]:hover:text-fg [&>a]:hover:underline">
        <a className="hit" href="https://www.linkedin.com/in/jiwon-han-380b29274/" target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <span aria-hidden="true">·</span>
        <button className="hit hover:text-fg hover:underline" onClick={() => setModal('terms')}>
          이용약관
        </button>
        <span aria-hidden="true">·</span>
        <button className="hit hover:text-fg hover:underline" onClick={() => setModal('privacy')}>
          개인정보 처리방침
        </button>
        <span aria-hidden="true">·</span>
        <a className="hit" href="https://github.com/goneonly/ABSolid" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>

      {modal === 'privacy' && <PrivacyModal onClose={close} />}
      {modal === 'terms' && <TermsModal onClose={close} />}
      {modal === 'install' && <InstallGuideModal onClose={close} />}
      {modal === 'nickname' && (
        <NicknameModal
          session={session}
          initial={nickname}
          onSaved={(v) => {
            setNickname(v)
            onChanged()
          }}
          onClose={close}
        />
      )}
      {modal === 'info' && <ProfileInfoModal onClose={close} />}
      {modal === 'password' && <ChangePasswordModal email={email} onClose={close} />}
      {modal === 'blocks' && <BlockedUsersModal onClose={close} />}

      {modal === 'export' && (
        <Modal label="기록 내보내기" onBackdrop={close}>
          <ModalTitle>기록 내보내기</ModalTitle>
          <ModalText>CSV를 다운로드 받겠습니까?</ModalText>
          <Button
            className="mt-5"
            onClick={() => {
              close()
              downloadRecordsCsv()
            }}
          >
            네
          </Button>
          <Button variant="secondary" className="mt-3" onClick={close}>
            아니오
          </Button>
        </Modal>
      )}

      {modal === 'reset' && (
        <PasswordConfirmModal
          title="비밀번호 확인"
          text="운동 기록 초기화는 되돌릴 수 없어요. 본인 확인을 위해 비밀번호를 입력해 주세요."
          email={email}
          onVerified={() => {
            close()
            setTimeout(resetRecords, 100) // 모달이 닫힌 뒤 마지막 확인 창 표시
          }}
          onClose={close}
        />
      )}

      {modal === 'delete' && (
        <PasswordConfirmModal
          title="회원 탈퇴"
          text={
            <>
              탈퇴하면 계정과 운동 기록·인증샷·그룹 정보가 <strong>모두 영구 삭제</strong>되며 되돌릴 수 없어요.
              계속하려면 비밀번호를 입력해 주세요.
            </>
          }
          confirmLabel="탈퇴하기"
          email={email}
          onVerified={deleteMyAccount}
          onClose={close}
        />
      )}
    </Page>
  )
}

// 비회원 안내: 기록이 이 기기에만 있다는 경고
function GuestNotice() {
  const count = Object.values(getRecords()).filter((r) => r?.completed).length
  return (
    <Banner className="mt-4 mb-0">
      {count > 0 ? `운동 기록 ${count}개가 이 기기에만 저장돼 있어요.` : '비회원 기록은 이 기기에만 저장돼요.'}
      <br />
      브라우저 데이터를 지우면 사라지고, 로그인해도 계정으로 옮겨지지 않아요. 로그인한 뒤의 운동부터 계정에 기록돼요.
    </Banner>
  )
}
