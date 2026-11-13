# API 명세

ABSolid 는 별도 백엔드 서버 없이 **Supabase** 를 서버로 씁니다. 앱은 `@supabase/supabase-js` 로 아래 네 가지를 호출합니다.

| 종류 | 설명 | 앱 코드 |
|---|---|---|
| Auth | 가입, 로그인, 비밀번호 | `src/server/auth.js` |
| 서버 함수 (RPC) | 검증이 필요한 쓰기. Postgres 함수 | `src/server/api.js`, `src/server/admin.js` |
| 테이블 직접 접근 | 조회와 단순 쓰기. 권한은 RLS 가 확인 | `src/server/api.js`, `src/server/admin.js` |
| Edge Function | 서버 권한이 필요한 작업 (탈퇴, 관리자 계정 삭제, 푸시) | `supabase/functions/` |

화면 코드는 Supabase 를 직접 부르지 않고 `auth.js`, `api.js`, `admin.js`, `push.js` 의 함수만 씁니다.

## 공통 규칙

- **인증**: 로그인하면 supabase-js 가 요청마다 토큰을 붙입니다. 서버는 `auth.uid()` 로 요청한 사람을 알아냅니다.
- **권한**: 모든 테이블에 RLS 가 켜져 있습니다. 아래 표의 "권한"은 RLS 정책 또는 함수 안의 검사입니다.
- **오류**: 서버 함수가 사유를 알려주며 거절하면 오류 코드 `P0001` 과 한국어 문구가 옵니다. 앱은 이 문구를 그대로 보여주고, 그 외 오류는 일반 안내 문구로 바꿉니다 (`api.js` 의 `reasonOf`).
- **날짜**: 운동 기록의 날짜는 한국 시간(Asia/Seoul) 기준 `YYYY-MM-DD` 입니다.
- **비회원**: 서버를 호출하지 않습니다. 기록은 기기(localStorage)에만 저장됩니다.

---

## 1. Auth (`src/server/auth.js`)

모든 함수는 `{ data }` 또는 `{ error: '한국어 문구' }` 를 돌려줍니다. 서버 캡차(Turnstile)가 켜져 있으면 `captchaToken` 이 필요합니다.

| 함수 | Supabase 호출 | 설명 |
|---|---|---|
| `signUp({ email, password, nickname, fullName, phone, termsVersion, captchaToken })` | `auth.signUp` | 가입. 이름, 전화번호, 동의는 `options.data` 로 보내고 서버 가입 트리거가 검증, 저장 |
| `signIn(email, password, captchaToken)` | `auth.signInWithPassword` | 로그인. 설정 화면의 본인 확인에도 사용 |
| `signOut()` | `auth.signOut` | 이 기기의 푸시 구독과 기기 데이터를 정리한 뒤 로그아웃 |
| `resendSignupEmail(email, captchaToken)` | `auth.resend` | 가입 인증 메일 다시 보내기 |
| `sendPasswordReset(email, captchaToken)` | `auth.resetPasswordForEmail` | 비밀번호 재설정 메일 |
| `updatePassword(newPassword)` | `auth.updateUser` | 새 비밀번호 저장 |
| `isDisposableEmail(email)` | RPC `is_disposable_email` | 일회용 메일 여부 (가입 전 안내용) |
| `deleteAccount()` | Edge Function `delete-account` | 회원 탈퇴 |

**가입 시 서버 검증** (`auth.users` 트리거, v0.10, v0.11 SQL)

| 항목 | 규칙 |
|---|---|
| 이름 `full_name` | 한글 또는 영문 2~20자 |
| 전화번호 `phone` | 한국 휴대폰 번호 (01X, 10~11자리) |
| 동의 `age_over_14` | `true` 여야 함 |
| 이메일 | 일회용 메일 도메인이면 거절 |

검증에 실패하면 가입이 거절되고 앱은 "가입 정보를 저장하지 못했어요"를 보여줍니다. 비밀번호는 8자 이상, 영문과 숫자를 함께 써야 합니다 (앱 검사 + Supabase 대시보드 설정).

---

## 2. 서버 함수 (RPC)

`supabase.rpc('이름', { 인자 })` 로 호출합니다. 로그인하지 않으면 모두 `로그인이 필요해요.` 로 거절됩니다 (`is_disposable_email` 제외).

### 운동

| 함수 | 인자 | 반환 | 설명 |
|---|---|---|---|
| `start_workout` | `p_video_seconds` int | 세션 id (uuid) | 영상 재생을 시작할 때 호출. 영상 길이는 60~3600초로 보정 |
| `complete_workout` | `p_session` uuid | 기록된 날짜 | 시작 후 영상 길이의 80% 이상 지나야 기록. 같은 날 다시 하면 완료 시각만 갱신 |

`complete_workout` 거절 사유: 시청 시간 부족("약 N분 남았어요"), 세션 없음, 시작한 지 하루 넘음.

### 그룹

| 함수 | 인자 | 반환 | 설명 |
|---|---|---|---|
| `create_group` | `p_name`, `p_max_members`(2~50), `p_members_only` | 그룹 행 | 그룹과 내 멤버십, 초대 코드(6자리)를 한 번에 생성. 한 사람당 하루 5개 |
| `join_group` | `code` | 그룹 행 (틀린 코드면 빈 결과) | 정원, 회원 제한 확인 후 참여. 틀린 코드는 1시간에 10번까지 |
| `leave_group` | `p_gid` | 그룹이 삭제됐는지 (boolean) | 그룹장이 나가면 가장 먼저 참여한 멤버에게 위임, 마지막 멤버면 그룹 삭제 |
| `set_group_photo` | `p_gid`, `p_url`(null 이면 삭제) | 없음 | 그룹장만. 주소는 `group-photos` 버킷의 그 그룹 폴더여야 함 |
| `get_group_profiles` | `gid` | `[{ id, nickname, avatar_url }]` | 같은 그룹 멤버의 닉네임, 프로필 사진만 (이름, 전화번호는 주지 않음) |

`join_group` 은 틀린 코드에 오류를 내지 않고 빈 결과를 줍니다. 오류를 내면 "틀린 횟수" 기록까지 함께 되돌려지기 때문입니다. 앱은 빈 결과를 "초대 코드를 찾을 수 없어요"로 보여줍니다.

### 응원, 차단

| 함수 | 인자 | 반환 | 설명 |
|---|---|---|---|
| `send_cheer` | `p_group`, `p_to` | 응원 id (오늘 이미 보냈으면 null) | 같은 그룹 멤버에게 하루 한 번. 종류(`done`/`nudge`)는 상대가 오늘 운동했는지로 서버가 정함. 차단 관계면 거절 |
| `my_received_cheers` | 없음 | `[{ from_nickname, kind, group_name, created_at }]` | 오늘 내가 받은 응원. 내가 차단한 사람의 응원은 제외 |
| `block_user` | `p_target` | 없음 | 차단. 상대에게 알리지 않음 |
| `unblock_user` | `p_target` | 없음 | 차단 해제 |
| `my_blocks` | 없음 | `[{ id, nickname, created_at }]` | 내가 차단한 사용자 |

### 기타

| 함수 | 인자 | 반환 | 설명 |
|---|---|---|---|
| `register_push` | `p_endpoint`, `p_p256dh`, `p_auth` | 없음 | 이 기기의 푸시 구독을 현재 계정으로 등록 (다른 계정이 쓰던 기기면 옮김) |
| `is_disposable_email` | `p_email` | boolean | 일회용 메일 여부. 비로그인도 호출 가능 |
| `admin_stats` | 없음 | 통계 json | 관리자만. 회원 수, 활동, 신고, 사진 용량 |

---

## 3. 테이블

"앱의 접근"은 앱이 실제로 쓰는 방식이고, 괄호 안은 RLS 가 허용하는 범위입니다.

| 테이블 | 내용 | 앱의 접근 |
|---|---|---|
| `profiles` | 닉네임, 이름, 전화번호, 프로필 사진, 역할(`role`), 활성 여부, 동의 기록 | 본인 행 조회, 수정. `role`, `is_active` 는 트리거가 본인 수정을 막음. 관리자는 전체 조회, 수정 |
| `workouts` | 운동 기록 (`user_id`, `date`, `day`, `completed_at`, `photo_url`) | 조회: 본인과 같은 그룹 멤버. 생성은 `complete_workout` 만. 본인은 사진 연결 수정과 삭제 가능 |
| `workout_sessions` | 시청 세션 | 직접 접근 불가 (함수 전용) |
| `groups` | 그룹 (`name`, `invite_code`, `max_members`, `members_only`, `created_by`, `photo_url`) | 조회: 내가 속한 그룹. 생성은 `create_group` 만. 관리자는 삭제 가능 |
| `group_members` | 멤버십 | 조회: 같은 그룹 멤버. 참여, 나가기는 함수만 |
| `cheers` | 응원 (`from_user`, `to_user`, `date`, `kind`) | 조회: 보낸 사람, 받은 사람, 받은 사람과 같은 그룹 멤버. 생성은 `send_cheer` 만 |
| `user_blocks` | 차단 (`blocker`, `blocked`) | 조회: 내가 한 차단만. 추가, 해제는 함수 |
| `reports` | 인증샷 신고 | 생성: 본인 이름으로만 (하루 20건, 같은 인증샷 중복 불가). 조회, 처리는 관리자 |
| `announcements` | 공지 | 조회: 누구나. 생성, 수정, 삭제는 관리자 |
| `app_config` | 앱 설정 (`playlist_id`) | 조회: 누구나. 수정은 관리자 |
| `push_subscriptions` | 푸시 구독 | 조회, 삭제: 본인. 등록은 `register_push` |
| `blocked_email_domains`, `join_attempts` | 일회용 메일 도메인, 틀린 초대 코드 기록 | 직접 접근 불가 (함수 전용) |

`workouts.day` 는 클라이언트 값을 쓰지 않고 트리거가 날짜로 계산합니다 (31일은 Day 30).

---

## 4. Storage

| 버킷 | 공개 | 경로 | 권한 |
|---|---|---|---|
| `photos` | 비공개 | `{userId}/{YYYY-MM-DD}.jpg` | 올리기, 삭제: 본인 폴더. 보기: 본인, 같은 그룹 멤버, 관리자 (서명된 주소로만) |
| `avatars` | 공개 | `{userId}/avatar.jpg` | 올리기, 삭제: 본인 폴더 |
| `group-photos` | 공개 | `{groupId}/photo.jpg` | 올리기, 삭제: 그룹장 |

- 파일은 5MB 이하의 JPEG, PNG, WebP 만 올릴 수 있습니다. 앱은 올리기 전에 JPEG 로 압축합니다.
- 경로 규칙은 `src/server/storagePaths.js` 한 곳에서 만듭니다.
- 인증샷은 `workouts.photo_url` 에 주소가 아닌 **경로**를 저장하고, 볼 때마다 8시간짜리 서명 주소를 발급받습니다 (`signPhotoPaths`).

---

## 5. 자체 API 서버 (작업 중)

Supabase 앞에 둔 Hono 서버입니다. 코드는 `server/app.js`, 배포 입구는 `api/index.js` 입니다. 기능을 하나씩 옮기는 중이며 계획은 [스프린트 백로그](SPRINT_BACKLOG.md) 1번에 있습니다.

| 주소 | 인증 | 설명 |
|---|---|---|
| `GET /api/health` | 없음 | 서버가 살아 있는지 확인. `{ ok: true }` |

없는 주소는 404 와 `{ error }`, 예상 못 한 오류는 500 과 일반 안내 문구를 돌려줍니다.

## 6. Edge Functions

| 함수 | 호출 | 인증 | 설명 |
|---|---|---|---|
| `delete-account` | `POST` (본문 없음) | 로그인 토큰 | 본인 계정과 모든 데이터 삭제. 속한 그룹은 그룹장을 넘기고, 마지막 멤버였던 그룹은 삭제 |
| `admin-delete-user` | `POST { userId }` | 관리자 로그인 토큰 | 관리자가 다른 회원 계정을 완전히 삭제 (탈퇴와 같은 정리). 서버가 관리자인지 확인하고, 본인, 관리자 계정은 거절(400), 일반 회원이 부르면 403 |
| `notify-cheer` | `POST { cheerId }` | 로그인 토큰 | 응원 받은 사람에게 푸시. 본인이 10분 안에 보낸, 아직 알리지 않은 응원만. 받는 사람이 차단했으면 보내지 않음 |
| `send-reminders` | `POST` | `x-cron-secret` 헤더 | 오늘 운동 기록이 없는 푸시 구독자에게 리마인더. 매일 저녁 크론이 호출 |

응답은 JSON 입니다. 실패하면 `{ error }` 와 4xx/5xx 상태 코드가 옵니다.

---

## 7. 앱 함수 목록

화면에서 쓰는 함수입니다. 조회 함수는 비회원이면 빈 값을 돌려주고, 동작 함수는 실패하면 한국어 문구를 담은 `Error` 를 던집니다.

### `src/server/api.js` (회원 기능)

| 영역 | 함수 |
|---|---|
| 운동 기록 | `startWorkoutSession`, `completeWorkout`, `retryPendingCompletions`, `fetchServerRecords`, `resetServerWorkouts` |
| 인증샷 | `uploadPhoto`, `cleanupOldServerPhotos`, `signPhotoPaths` |
| 내 프로필 | `fetchMyRole`, `saveNickname`, `fetchMyProfileInfo`, `updateMyProfileInfo`, `uploadAvatar`, `fetchMyAvatarUrl`, `deleteAvatar` |
| 그룹 | `fetchMyGroups`, `createGroup`, `joinGroup`, `leaveGroup`, `uploadGroupPhoto`, `removeGroupPhoto`, `fetchGroupStatus`, `fetchGroupWorkoutDates` |
| 응원 | `sendCheer`, `notifyCheer`, `fetchTodayCheers`, `fetchReceivedCheers` |
| 차단 | `fetchBlockedIds`, `blockUser`, `unblockUser`, `fetchMyBlocks` |
| 신고 | `submitReport` |
| 공지, 설정 | `fetchActiveAnnouncement`, `getPlaylistId` |

### `src/server/admin.js` (관리자 화면)

`fetchStats`, `fetchUsers`, `setUserActive`, `deleteUserAdmin`, `fetchGroupsAdmin`, `deleteGroupAdmin`, `fetchReports`, `resolveReport`, `fetchAnnouncementsAdmin`, `createAnnouncement`, `setAnnouncementActive`, `deleteAnnouncement`, `setPlaylistId`

일반 회원이 호출하면 RLS 가 막아 실패하거나 빈 결과가 옵니다.

### `src/server/push.js` (푸시 알림)

`isPushConfigured`, `isPushSupported`, `getPushEnabled`, `enablePush`, `disablePush`

### `src/server/supabase.js` (연결, 로그인 상태)

`supabase`(클라이언트, 키가 없으면 `null`), `currentUser`, `currentUserId`, `storedSession`(기기에 저장된 로그인 정보를 네트워크 없이 바로 읽음 — 앱 시작용), `parseStoredSession`

---

## 함수를 추가할 때

1. 검증이 필요한 쓰기는 테이블에 직접 쓰지 말고 `supabase/vX.Y-이름.sql` 에 서버 함수로 만듭니다.
2. 같은 파일 번호로 `supabase/tests/` 에 권한, 공격 시나리오 테스트를 추가하고, `tests/run.sh` 의 실행 목록에 SQL 파일을 넣습니다.
3. `src/server/api.js` 에 호출 함수를 만들고 이 문서를 고칩니다.
4. 운영 반영 순서는 [SUPABASE_SETUP.md](SUPABASE_SETUP.md) 에 적습니다.
