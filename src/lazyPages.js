// 첫 화면에 필요 없는 화면은 따로 받아 오기 (앱 첫 다운로드를 줄여 로딩 화면을 빨리 걷음)
// 첫 화면이 뜬 뒤 여유 있을 때 미리 받아 두므로(prefetchPages) 탭을 눌렀을 때는 기다림이 거의 없음
import { lazy } from 'react'

const loaders = {
  Workout: () => import('./pages/Workout.jsx'),
  Group: () => import('./pages/Group.jsx'),
  Settings: () => import('./pages/Settings.jsx'),
  Admin: () => import('./pages/Admin.jsx'),
  OnboardingModal: () => import('./components/OnboardingModal.jsx'),
  PushConsentModal: () => import('./components/PushConsentModal.jsx'),
  RecoveryModal: () => import('./components/RecoveryModal.jsx'),
  WorkoutPlaceModal: () => import('./components/WorkoutPlaceModal.jsx'),
}

export const Workout = lazy(loaders.Workout)
export const Group = lazy(loaders.Group)
export const Settings = lazy(loaders.Settings)
export const Admin = lazy(loaders.Admin)
export const OnboardingModal = lazy(loaders.OnboardingModal)
export const PushConsentModal = lazy(loaders.PushConsentModal)
export const RecoveryModal = lazy(loaders.RecoveryModal)
export const WorkoutPlaceModal = lazy(loaders.WorkoutPlaceModal)

// 첫 화면 이후 한가할 때 나머지 화면을 미리 받아 둠 (실패해도 무시 — 탭을 열 때 다시 받음)
export function prefetchPages() {
  const run = () => Object.values(loaders).forEach((load) => load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
