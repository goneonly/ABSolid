# ABSolid

ABS + Solid 의 합성어로,
친구들과 그룹을 만들어 매일 복근 운동을 하고 기록을 나누는 모바일 웹앱(PWA)입니다.
(추후 하이브리드 앱으로 전향할 예정입니다)

https://absolid.vercel.app

## 주요 기능

**운동**

- 그날 날짜에 맞는 Day 1~30 영상을 끝까지 보면 완료로 기록됩니다.
- 시청 시간은 서버가 확인합니다. 영상 길이의 80% 이상이 지나야 완료돼요.
- 완료할 때 인증샷을 첨부할 수 있습니다.

**기록**

- 연속 운동일(streak), 주간 리포트, CSV 내보내기

**그룹**

- 초대 코드로 참여하고, 여러 그룹에 동시에 들어갈 수 있습니다.
- 멤버 현황, 리더보드, 오늘의 인증샷, 그룹 사진
- 멤버끼리 하루 한 번 응원을 보낼 수 있습니다.
- 인증샷 신고, 멤버 차단 (차단한 사람의 기록, 인증샷, 응원은 보이지 않음)

**알림**

- 저녁까지 운동을 안 했으면 홈 배너와 푸시로 알려줍니다.
- 응원을 받으면 푸시가 옵니다.

**계정**

- 이메일 가입(이름, 전화번호, 만 14세 동의 필수), 이메일 인증
- 로그인 없이 비회원으로도 쓸 수 있습니다. 기록은 그 기기에만 저장돼요.
- 앱 안에서 회원 탈퇴 가능

**관리자**

- 대시보드, 회원, 그룹, 신고, 공지 관리

## 보안

- 모든 테이블에 RLS를 적용했고, 권한, 공격 시나리오를 DB 테스트로 검증합니다.
- 가입, 로그인에 Cloudflare Turnstile 캡차를 적용했습니다.
- 일회용 이메일 가입을 막고, 그룹 생성, 신고, 초대 코드 입력 횟수를 제한합니다.
- 비밀번호는 8자 이상, 영문과 숫자를 함께 써야 합니다.

## 기술 스택

React 18, Vite 8, Tailwind CSS 4, Supabase(Auth, Postgres, Storage, Edge Functions), Vercel

## 시작하기

```bash
npm install
cp .env.example .env
npm run dev
```

`.env`에 넣는 값은 아래와 같습니다. Supabase 키가 없으면 비회원 모드로만 동작합니다.

| 변수                                          | 설명                                    |
| --------------------------------------------- | --------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase 프로젝트 주소와 공개 키        |
| `VITE_VAPID_PUBLIC_KEY`                       | 푸시 알림용 공개 키 (없으면 알림 꺼짐)  |
| `VITE_TURNSTILE_SITE_KEY`                     | 캡차 사이트 키 (없으면 캡차 표시 안 함) |

자주 쓰는 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run check` | 커밋 전 한 번에 검사 (린트, 코드 스타일, 단위 테스트, 빌드) |
| `npm run build` | 배포용 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 로 코드 스타일 정리 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:db` | DB 보안 테스트. SQL을 임시 Postgres에 적용해 권한과 공격 시나리오를 검증합니다. PostgreSQL이 설치돼 있어야 합니다. |
| `npm run splash` | 아이폰 시작 이미지 다시 만들기 (로딩 화면 디자인을 바꿨을 때) |
| `npm run icons` | 홈 화면 앱 아이콘 다시 만들기 (로고를 바꿨을 때) |

GitHub에 푸시하면 CI가 린트, 코드 스타일, 단위 테스트, 빌드, DB 보안 테스트를 모두 돌립니다.
SQL 파일을 새로 만들면 `supabase/tests/run.sh`의 실행 순서 목록에도 추가해 주세요.

서버 설정은 아래 문서에 정리돼 있습니다.

- [Supabase 설정](docs/SUPABASE_SETUP.md): SQL 실행 순서, 스토리지, Edge Function 배포, 이메일 인증, 캡차, 요청 제한
- [푸시 알림 설정](docs/NOTIFICATIONS_SETUP.md): VAPID 키, 리마인더 발송

코드를 읽기 전에 보면 좋은 문서입니다.

- [인수인계 안내](docs/HANDOVER.md): 앱이 켜지는 과정, 자주 하는 작업, 배포와 릴리스 절차, 주의할 점
- [API 명세](docs/API.md): 서버 함수, 테이블과 권한, 저장소, 앱 함수 목록
- [변경 기록](docs/CHANGELOG.md): 버전별 변경 사항. 버전을 올릴 때마다 함께 고칩니다.

## 프로젝트 구조

```
index.html             로딩 화면과 화면 테마 적용 (앱 코드보다 먼저 실행)
src/
├── main.jsx           시작점
├── App.jsx            화면 전환과 로그인 상태에 따른 시작 처리
├── lazyPages.js       첫 화면에 필요 없는 화면을 나중에 받아 오는 목록
├── index.css          디자인 토큰 (색상, 글자 크기, 모서리), 라이트 테마
├── pages/             화면 (Login, Home, Workout, Group, Settings, Admin)
│   ├── group/         그룹 화면 부품 (상세, 멤버 줄, 참여와 생성 카드)
│   └── settings/      설정 화면 부품 (프로필 사진, 변경 모달, 본인 확인, 알림, 테마, 차단 목록)
├── components/        공통 UI(ui.jsx), 모달, 리더보드, 주간 리포트, 캡차, 사진 고르기
├── server/            서버(Supabase)와 통신하는 코드
│   ├── supabase.js    연결, 로그인 사용자 조회, 저장된 로그인 정보 읽기
│   ├── api.js         회원 기능 (기록, 사진, 프로필, 그룹, 응원, 차단, 신고)
│   ├── admin.js       관리자 화면 전용
│   ├── auth.js        가입, 로그인, 비밀번호, 탈퇴 (오류 문구는 authErrors.js)
│   ├── push.js        푸시 알림 구독
│   └── storagePaths.js  Storage 버킷과 파일 경로 규칙
├── lib/               서버와 무관한 기기 쪽 코드
│   ├── storage.js     기기 저장소(localStorage). 키는 이 파일에서만 관리
│   ├── stats.js       리더보드 순위, 주간 리포트, 완료 축하 문구
│   ├── validation.js  입력값 검사 (이메일, 이름, 전화번호, 비밀번호, 닉네임)
│   ├── theme.js       화면 테마 (시스템, 라이트, 다크)
│   ├── splash.js      로딩 화면 단계 표시와 닫기
│   └── 그 외          image(사진 압축), install(홈 화면 추가), toast(안내 한 줄), youtube, terms(약관 버전), easterEggs
├── hooks/             useAuth(로그인 상태), useLoad(서버 데이터 불러오기)
└── test/              테스트 공통 준비
public/                아이콘, 아이폰 시작 이미지(splash/), 서비스 워커(sw.js)
scripts/               make-splash-images.mjs (아이폰 시작 이미지 생성)
supabase/
├── *.sql              스키마와 보안 정책 (실행 순서는 Supabase 설정 문서 참고)
├── tests/             DB 보안 테스트
└── functions/         delete-account(탈퇴), admin-delete-user(관리자 계정 삭제),
                       send-reminders(리마인더), notify-cheer(응원 알림)
docs/                  인수인계 안내, API 명세, 변경 기록, 서버 설정 문서
prototypes/
└── situp-render/      운동 영상을 3D로 만드는 Blender 파이프라인 (작업 중)
```

## 지켜야 할 규칙

- 오늘의 영상은 이번 달 날짜와 같은 Day입니다. 31일은 Day 30을 보여줍니다.
- 스타일은 `index.css`에 정의한 토큰만 씁니다. 임의의 색상이나 크기를 넣지 않습니다.
- 운동 기록과 응원은 서버 검증 함수(RPC)로만 만듭니다. 클라이언트가 테이블에 직접 쓰지 않습니다.

---

개인 프로젝트로, Claude와 함께 바이브 코딩으로 만들고 있습니다.
