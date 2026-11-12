import { Suspense, useState, useCallback, useEffect } from 'react'
import Home from './pages/Home.jsx'
import BottomNav from './components/BottomNav.jsx'
import { Logo, Page, PageTitle, Skeleton, Sub } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import {
  Admin,
  Group,
  OnboardingModal,
  PushConsentModal,
  RecoveryModal,
  Settings,
  Workout,
  prefetchPages,
} from './lazyPages.js'
import { supabase } from './server/supabase.js'
import { isPushSupported } from './server/push.js'
import {
  getRecords,
  mergeRecords,
  cleanupLocalPhotos,
  isGuestChosen,
  setGuestChosen,
  isOnboardingPending,
  markOnboardingDone,
  isPushConsentAsked,
  markPushConsentAsked,
  isServerCleanupDoneToday,
  markServerCleanupDone,
} from './lib/storage.js'
import { useAuth } from './hooks/useAuth.js'
import { hideSplash } from './lib/splash.js'
import { signOut } from './server/auth.js'
import { fetchMyRole, fetchServerRecords, retryPendingCompletions, cleanupOldServerPhotos } from './server/api.js'

export default function App() {
  // view: home | workout | group | settings | admin
  const [view, setView] = useState('home')
  const [, setTick] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showPushConsent, setShowPushConsent] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [justDone, setJustDone] = useState(false) // 운동 완료 직후 홈 축하 표시
  const [guest, setGuest] = useState(isGuestChosen)
  // 로딩 화면의 '오프라인으로 시작': 로그인 확인이 12초 넘게 안 끝날 때 기기 기록으로 먼저 시작 (확인되면 그대로 회원 화면으로)
  const [offlineStart, setOfflineStart] = useState(false)
  const session = useAuth()
  // 로그인한 계정 id. 로그인 정보는 갱신될 때마다 새 객체로 오므로, 계정이 바뀔 때만 실행할 작업은 이 값을 기준으로 함
  const userId = session?.user?.id
  const accountKey = userId || 'guest'
  const records = getRecords()

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const endCelebration = useCallback(() => setJustDone(false), [])
  // 비회원이 로그인하려 할 때: 비회원 선택을 해제하면 첫 로그인 화면이 다시 표시됨 (설정, 그룹 탭의 로그인 버튼)
  const requestLogin = useCallback(() => {
    setGuestChosen(false)
    setGuest(false)
  }, [])

  useEffect(() => {
    const start = () => setOfflineStart(true)
    window.addEventListener('absolid:offline-start', start)
    return () => window.removeEventListener('absolid:offline-start', start)
  }, [])

  // 로그인 상태 확인이 끝나면(또는 오프라인 시작) 로딩 화면을 걷음
  const authChecked = session !== undefined || offlineStart
  useEffect(() => {
    if (!authChecked) return
    hideSplash()
    prefetchPages() // 첫 화면 이후 나머지 화면을 미리 받아 둠
  }, [authChecked])

  // 앱 시작 시: 7일 지난 로컬 인증샷 정리 (localStorage 용량 보호)
  useEffect(() => {
    cleanupLocalPhotos(7)
  }, [])

  // 비밀번호 재설정 메일 링크로 진입하면 새 비밀번호 설정 모달 표시
  useEffect(() => {
    if (!supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('settings')
        setShowRecovery(true)
      }
      // 로그아웃, 탈퇴하면 다시 첫 로그인 화면부터
      if (event === 'SIGNED_OUT') {
        setGuestChosen(false)
        setGuest(false)
        setView('home')
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 기능 소개 팝업: 가입 완료 후 첫 진입 1회 (비회원은 '비회원으로 시작하기'를 누를 때마다 — Login onGuest)
  useEffect(() => {
    if (userId && isOnboardingPending()) {
      setView('home')
      setShowOnboarding(true)
    }
  }, [userId])

  // 로그인 시: 역할 확인 (관리자 메뉴 노출) + 비활성 계정 차단
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false)
      return
    }
    let alive = true
    fetchMyRole()
      .then(({ role, isActive }) => {
        if (!alive) return
        if (!isActive) {
          alert('이용이 제한된 계정이에요. 문의가 필요하면 관리자에게 연락해 주세요.')
          signOut()
          return
        }
        setIsAdmin(role === 'admin')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [userId])

  // 로그인되면: 연결 문제로 못 남긴 완료 기록 재시도 + 서버 기록 내려받아 병합
  // (비회원 시절 기록은 시청 확인이 없어 서버로 올리지 않음 — 기기에만 남음)
  // + 하루 1회, 30일 지난 내 서버 인증샷 정리
  useEffect(() => {
    if (!userId) return
    let alive = true
    retryPendingCompletions()
      .then(fetchServerRecords)
      .then((server) => {
        if (alive && server) {
          mergeRecords(server)
          refresh()
        }
      })
      .catch(() => {})
    if (!isServerCleanupDoneToday()) {
      cleanupOldServerPhotos(30)
        .then(markServerCleanupDone)
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [userId, refresh])

  // 첫 화면: 서버 연결 시, 로그인도 비회원 선택도 안 했으면 로그인 화면
  if (!authChecked) return null // 저장된 세션 확인 중 — 그동안은 로딩 화면 (index.html)
  if (supabase && !session && !guest && !offlineStart) {
    return (
      <Login
        onDone={() => setView('home')}
        onGuest={() => {
          setGuestChosen(true)
          setGuest(true)
          setView('home')
          setShowOnboarding(true) // 비회원으로 시작할 때마다 사용법 소개
        }}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col pb-22">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => setView('home')} aria-label="홈으로">
          <Logo className="text-xl" />
        </button>
        {session && <span className="rounded-sm bg-surface-2 px-2 py-1 text-xs font-bold text-dim">로그인됨</span>}
      </header>

      {/* 따로 받아 오는 화면이 아직 도착하지 않았으면 잠깐 회색 자리표시 */}
      <Suspense
        fallback={
          <Page>
            <Skeleton lines={2} />
          </Page>
        }
      >
        {view === 'home' && (
          <Home
            records={records}
            session={session}
            onStart={() => setView('workout')}
            celebrate={justDone}
            onCelebrated={endCelebration}
          />
        )}
        {view === 'workout' && (
          <Workout
            session={session}
            onDone={() => {
              refresh()
              setJustDone(true)
              setView('home')
            }}
          />
        )}
        {/* 계정이 바뀌면 화면 상태(닉네임 입력값, 선택한 그룹 등)를 새로 시작 */}
        {view === 'group' && (
          <Group key={accountKey} records={records} session={session} onRequestLogin={requestLogin} />
        )}
        {view === 'settings' && (
          <Settings
            key={accountKey}
            session={session}
            onChanged={refresh}
            isAdmin={isAdmin}
            onOpenAdmin={() => setView('admin')}
            onRequestLogin={requestLogin}
          />
        )}
        {view === 'admin' &&
          (isAdmin ? (
            <Admin onBack={() => setView('settings')} />
          ) : (
            <Page>
              <PageTitle>관리자</PageTitle>
              <Sub>접근 권한이 없어요.</Sub>
            </Page>
          ))}
      </Suspense>

      <Suspense fallback={null}>
        {showOnboarding && (
          <OnboardingModal
            onClose={() => {
              markOnboardingDone()
              setShowOnboarding(false)
              // 온보딩 종료 후: 푸시 알림 동의 팝업을 1회 표시 (지원 브라우저 + 회원만 — 푸시는 로그인 필요)
              if (session && isPushSupported() && !isPushConsentAsked()) {
                setShowPushConsent(true)
              }
            }}
          />
        )}

        {showPushConsent && (
          <PushConsentModal
            onClose={() => {
              markPushConsentAsked()
              setShowPushConsent(false)
            }}
          />
        )}

        {showRecovery && <RecoveryModal onClose={() => setShowRecovery(false)} />}
      </Suspense>

      <BottomNav view={view} onChange={setView} />
    </div>
  )
}
