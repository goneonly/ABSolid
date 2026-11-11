# Supabase 연결 가이드 (약 10분, 무료)

로그인·그룹·서버 저장 기능을 켜려면 Supabase 무료 프로젝트가 필요해요.
아래 순서대로 따라 하면 됩니다.

## 1. 계정 및 프로젝트 만들기
1. https://supabase.com 접속 → **Start your project** → GitHub 또는 이메일로 가입
2. **New project** 클릭
   - Name: `absolid`
   - Database Password: 아무 강한 비밀번호 (메모해 두세요)
   - Region: `Northeast Asia (Seoul)` 선택
3. 1~2분 뒤 프로젝트가 준비됩니다.

## 2. DB 테이블 만들기
1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 폴더의 `supabase/schema.sql` 파일 내용을 전부 복사해 붙여넣기
3. **Run** 클릭 → "Success" 확인

## 2-1. 사진 저장소 만들기 (Day 5)
같은 방법으로 **SQL Editor → New query**에 `supabase/storage.sql` 내용을 붙여넣고 **Run**.
(인증샷 업로드용 공개 버킷과 보안 규칙이 만들어져요)

## 2-2. 회원정보 보안 패치 (필수)
**SQL Editor → New query**에 `supabase/profiles-security-fix.sql` 내용을 붙여넣고 **Run**.
(기존 정책이 실명·전화번호·그룹 초대코드를 anon key만으로 전체 조회 가능하게 열어뒀던
문제를 막습니다 — 이미 배포된 프로젝트라면 반드시 적용하세요)

## 2-3. 보안·버그 통합 패치 (v0.4, 필수)
`admin.sql` 실행 후, **SQL Editor → New query**에 `supabase/security-and-fixes.sql` 내용을 붙여넣고 **Run**. 다음을 한 번에 적용합니다.
- **권한 상승 차단**: 일반 사용자가 스스로 `role='admin'`으로 바꾸던 문제를 트리거로 차단
- **관리자 회원 조회 복구**: 관리자 화면의 회원 목록·신고자 이름이 보이도록 profiles 조회 정책 추가
- **그룹 참여 원자화**: 정원 초과 경합 방지 + 한 사람은 한 그룹만
- **회원 탈퇴**: 본인 프로필 삭제 정책

> ⚠️ **인증샷 비공개 전환 순서**: 이 파일에는 `photos` 버킷을 비공개로 바꾸는 문장이 포함돼 있어요. **v0.4 프론트엔드를 먼저 배포한 뒤** 실행하세요(프론트가 signed URL로 사진을 불러오도록 바뀌었기 때문). 순서가 바뀌면 잠깐 사진이 안 보일 수 있어요. 과거 사진도 자동 호환됩니다.

## 2-3-1. 여러 그룹 참여·그룹 사진·점검 패치 (v0.5, 필수)
`security-and-fixes.sql` 실행 후, **SQL Editor → New query**에 `supabase/v0.5-groups-and-fixes.sql` 내용을 붙여넣고 **Run**. (재실행 안전)
- **여러 그룹 참여**: 한 사람이 여러 그룹에 참여할 수 있어요. 그룹 생성·참여·나가기는 서버 함수(`create_group`/`join_group`/`leave_group`)로만 처리
- **그룹장 위임**: 그룹장이 나가거나 탈퇴하면 가장 먼저 참여한 멤버에게 자동 위임, 마지막 멤버가 나가면 그룹 삭제
- **그룹 사진**: `group-photos` 버킷 + 그룹장만 변경
- **보안**: 정원·회원제한을 건너뛴 직접 가입 차단, 인증샷은 본인·같은 그룹 멤버·관리자만 열람
- **버그**: SQL Editor에서 관리자 지정이 되돌려지던 문제, 관리자 통계의 '오늘'이 UTC 기준이던 문제

> 이 SQL을 실행한 뒤 아래 2-4의 `delete-account` 엣지 함수를 **다시 배포**해야 탈퇴 시 그룹장 위임이 적용돼요.

## 2-3-2. 보안·무결성 보강 (v0.6, 필수)
`v0.5-groups-and-fixes.sql` 실행 후, **SQL Editor → New query**에 `supabase/v0.6-security.sql` 내용을 붙여넣고 **Run**. (재실행 안전)
- **운동 기록 날짜 제한**: 오늘·어제(한국 시간) 날짜만 저장 가능, Day 번호는 서버가 날짜로 계산
- **프로필 사진 주소 제한**: 본인 프로필 사진 폴더의 주소만 저장 가능
- **업로드 제한**: 사진 버킷별 5MB, 이미지(JPEG·PNG·WebP)만
- **정리**: 앱에서 쓰지 않던 공개 함수 2개 삭제

## 2-3-3. 운동 완료 서버 검증·가입 동의 기록 (v0.7, 필수)
`v0.6-security.sql` 실행 후 `supabase/v0.7-workout-verify-and-consent.sql` 을 실행하고, **바로 이어서 v0.7 프론트엔드를 배포**하세요. (재실행 안전)
- **시청 검증**: 영상 재생 시작 시각을 서버가 기록하고, 영상 길이의 80% 이상 시간이 지나야 완료로 기록
- **직접 기록 차단**: 운동 기록은 서버 검증 함수로만 생성 (예전 앱은 이 SQL 실행 후 기록 저장이 거부됨)
- **가입 동의**: 만 14세 이상 확인, 약관 버전·동의 시각을 프로필에 저장

## 2-3-4. 그룹 응원·알림 (v0.8, 필수)
`v0.7` 실행 후 `supabase/v0.8-cheers-and-push.sql` 실행. 푸시 알림(리마인더·응원) 서버 설정은 [알림 설정 가이드](NOTIFICATIONS_SETUP.md) 참고.

## 2-3-5. 사용자 차단 (v0.9, 필수)
`v0.8` 실행 후 `supabase/v0.9-user-blocks.sql` 실행 (재실행 안전). 이어서 응원 알림 함수를 다시 배포하세요: `supabase functions deploy notify-cheer`
- **차단**: 그룹 화면의 멤버 행·인증샷에서 차단 → 차단한 사람의 기록·인증샷·받은 응원이 숨겨지고, 서로 응원 불가 (상대에게 알리지 않음)
- **해제**: 설정 > 차단한 사용자
- SQL 실행 전 배포된 앱은 차단 버튼만 실패 안내를 띄우고 나머지 화면은 그대로 동작

## 2-3-6. 비밀번호 최소 길이 (대시보드 설정, 필수)
앱은 가입·비밀번호 변경 시 **8자 이상, 영문+숫자**를 요구해요. 서버도 같게 맞추세요.
- **Authentication → Sign In / Providers → Email → Minimum password length: 8**
- **Password requirements: Letters and digits**
- 기존 6~7자 비밀번호 사용자는 로그인은 그대로 되고, 다음에 비밀번호를 바꿀 때 8자 규칙이 적용돼요.

## 2-3-7. 가입 정보 서버 저장 (v0.10, 필수)
`v0.9` 실행 후 `supabase/v0.10-signup-profile.sql` 실행 (재실행 안전).
- 가입 요청에 실린 이름·전화번호·만 14세 동의를 서버가 검증해 가입 순간에 저장 → 메일 인증 후 어느 기기로 로그인해도 유지
- 이메일 가입은 이름·전화번호·동의가 없거나 형식이 틀리면 가입 자체가 거절됨 (API 직접 가입으로 우회 불가)
- 대시보드 **Authentication → Users → Add user** 로 만드는 계정은 검사하지 않음 (빈 프로필로 생성)

## 2-3-8. 이메일 인증 켜기 (대시보드 설정 — 순서 중요)
**SMTP 를 먼저 연결하세요.** Supabase 기본 메일 서버는 프로젝트 팀원에게만, 시간당 몇 통만 보내서 SMTP 없이 인증을 켜면 일반 사용자는 가입 메일을 못 받아 **가입이 막혀요.**
1. **Authentication → Emails → SMTP Settings**: 외부 SMTP 연결 (예: Gmail 앱 비밀번호 `smtp.gmail.com:465`, 또는 Resend 등)
2. **Authentication → URL Configuration**: Site URL `https://absolid.vercel.app`, Redirect URLs 에 같은 주소 추가 (인증 메일 링크가 앱으로 돌아오게)
3. (선택) **Authentication → Emails → Templates → Confirm signup** 문구를 한국어로
4. **Authentication → Sign In / Providers → Email → Confirm email: ON**
- 켜면: 가입 → "확인 메일을 보냈어요" 안내 → 메일 링크를 누르면 앱으로 돌아와 바로 로그인. 미인증 상태로 로그인하면 '인증 메일 다시 보내기' 버튼이 나와요.
- 이미 가입한 사용자는 영향 없음.

## 2-3-9. 가입·기능 남용 방지 (v0.11, 필수)
`v0.10` 실행 후 `supabase/v0.11-abuse-limits.sql` 실행 (재실행 안전).
- **일회용 메일 가입 차단**: 앱이 가입 전에 안내하고, API 로 직접 가입해도 서버가 거절. 도메인 추가: `insert into public.blocked_email_domains values ('example.com');`
- **그룹 생성** 하루 5개 · **신고** 하루 20건, 같은 인증샷 중복 신고 불가
- **초대 코드**: 틀린 코드는 한 사람당 1시간에 10번까지 (코드 무작위 대입 방지)

## 2-3-10. 봇 가입·로그인 차단 — Cloudflare Turnstile (선택이지만 출시 전 권장)
**앱 키와 서버 키를 함께 설정하세요.** 서버만 켜면 앱이 토큰을 못 보내 로그인이 전부 막혀요.
1. Cloudflare 대시보드 → **Turnstile → Add widget**: 도메인 `absolid.vercel.app` (로컬 테스트용 `localhost` 도 추가), Widget mode **Managed** → **Site Key**·**Secret Key** 발급 (무료)
2. Vercel → Project → Settings → Environment Variables: `VITE_TURNSTILE_SITE_KEY` = Site Key → **재배포**
3. 재배포 확인 후 Supabase **Authentication → Attack Protection → Enable Captcha protection**: Provider **Turnstile**, Secret Key 입력
- 적용 범위: 가입·로그인·비밀번호 재설정·인증 메일 재발송, 설정의 본인 확인(기록 초기화·비밀번호 변경·탈퇴)
- 보통 사용자는 퍼즐 없이 자동 통과. 의심스러운 요청만 확인란 클릭을 요구

## 2-3-11. IP 당 요청 제한 (대시보드 설정, 권장)
**Authentication → Rate Limits** 에서 아래 정도로 설정 (기본값보다 엄격하게):
| 항목 | 권장값 |
|---|---|
| Sign-ups and sign-ins (IP 당 5분) | 30 |
| Token refreshes (IP 당 5분) | 150 (기본값 유지) |
| Email sending (시간당, SMTP 연결 후) | 30 |
| Verifications / OTP (IP 당 5분) | 30 |

## 2-4. 회원 탈퇴 기능 (선택 — 엣지 함수)
계정·데이터 완전 삭제를 켜려면 Supabase CLI로 배포하세요:
```bash
supabase functions deploy delete-account
```
(미배포 시 설정의 "회원 탈퇴" 버튼은 실패 안내만 표시됩니다.)

## 2-5. 비밀번호 재설정 메일 (설정 확인)
**Authentication → URL Configuration**의 **Site URL**에 배포 주소(예: `https://absolid.vercel.app`)를 넣어야 재설정 링크가 앱으로 돌아옵니다. (로컬 테스트는 `http://localhost:5173`)

## 3. 이메일 인증 (권장: 켜기)
가입 시 본인 이메일인지 확인하려면 **Authentication → Sign In / Providers → Email → Confirm email** 을 켜세요.
끄면 다른 사람의 이메일 주소로도 가입할 수 있어요.

> Supabase 기본 메일 서버는 프로젝트 팀원 주소로만, 그것도 시간당 몇 통만 보내요.
> 일반 사용자에게 인증·비밀번호 재설정 메일이 가려면 **Authentication → Emails → SMTP Settings** 에서
> 외부 메일 서비스(Resend, Gmail SMTP 등)를 연결해야 해요.

## 4. 앱에 키 연결하기
1. **Project Settings(톱니) → API Keys** 에서 두 값을 복사
   - Project URL (예: `https://abcd1234.supabase.co`)
   - `anon` `public` 키 (긴 문자열)
2. 이 폴더의 `.env.example`을 복사해 `.env` 파일을 만들고 값 붙여넣기:
   ```
   VITE_SUPABASE_URL=복사한 Project URL
   VITE_SUPABASE_ANON_KEY=복사한 anon 키
   ```

## 5. 확인
`npm run dev`로 앱을 켜면 설정 탭에 로그인/회원가입이 활성화되어 있어야 해요.
(Vercel 배포 시에는 같은 두 값을 Vercel 환경 변수에도 등록합니다 — Day 7에 함께 진행)
