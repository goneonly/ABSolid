# 인수인계 안내

ABSolid 를 처음 맡는 개발자가 코드를 읽기 전에 보는 문서입니다. 전체 구조는 [README](../README.md), 서버 함수와 권한은 [API 명세](API.md), 서버 설정은 [Supabase 설정](SUPABASE_SETUP.md)과 [푸시 알림 설정](NOTIFICATIONS_SETUP.md)에 있습니다.

## 1. 한눈에 보기

- 화면: React 18, Vite 8, Tailwind CSS 4. 배포는 Vercel (main 브랜치에 push 하면 자동 배포)
- 서버: 별도 백엔드 없이 Supabase (인증, Postgres, Storage, Edge Functions)
- 형태: 모바일 웹앱(PWA). 홈 화면에 추가하면 앱처럼 열리고 푸시 알림을 받음
- 운영 주소: https://absolid.vercel.app

## 2. 처음 실행하기

Node.js 24 가 필요합니다. 버전은 `.nvmrc` 한 곳에 적혀 있고, CI 와 `package.json` 의 `engines` 가 같은 값을 씁니다. Vercel 프로젝트 설정의 Node.js Version 도 24.x 로 맞춰 둡니다.

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` 에는 브라우저에 노출되는 공개 키만 넣습니다. 값이 없으면 서버 연결 없이 비회원 모드로만 동작합니다. 서버 쪽 비밀 키(서비스 키, 크론 비밀값, 푸시 개인 키)는 Supabase 의 Edge Function 시크릿에만 있고, 저장소와 `.env` 에는 절대 넣지 않습니다.

커밋 전에 한 번에 검사하려면 아래를 실행합니다. 린트, 코드 스타일, 단위 테스트, 빌드를 차례로 돌립니다.

```bash
npm run check
```

SQL 을 고쳤다면 DB 보안 테스트도 돌립니다. PostgreSQL 이 설치돼 있어야 합니다.

```bash
npm run test:db
```

## 3. 앱이 켜지는 과정

1. `index.html` 이 열리면 맨 위 스크립트가 화면 테마(다크, 라이트)를 먼저 적용하고, 로딩 화면(`#splash`)이 바로 보입니다. 앱 코드를 받기 전이라 순수 HTML 과 CSS 로 되어 있습니다.
2. `src/main.jsx` 가 실행되면 로딩 화면의 진행 막대가 2단계로 넘어갑니다.
3. `src/hooks/useAuth.js` 가 기기에 저장된 로그인 정보를 네트워크 없이 읽어 바로 로그인 상태를 정합니다. 만료된 로그인은 Supabase 가 뒤에서 갱신합니다.
4. `src/App.jsx` 가 로그인 상태를 알게 되면 `src/lib/splash.js` 의 `hideSplash()` 로 로딩 화면을 닫습니다. 최소 1.4초는 보여 줍니다.
5. 첫 화면(홈 또는 로그인)이 뜬 뒤, 나머지 화면은 `src/lazyPages.js` 가 한가할 때 미리 받아 둡니다.

로딩이 5초를 넘으면 안내 문구, 12초를 넘으면 다시 시도 버튼이 나옵니다. 이 처리는 앱 코드가 늦어도 동작하도록 `index.html` 안에 있습니다.

## 4. 데이터가 있는 곳

| 종류 | 위치 | 코드 |
| --- | --- | --- |
| 기기 저장 (비회원 기록, 닉네임, 테마, 각종 표시 여부) | localStorage | `src/lib/storage.js` 에서만 키를 정의 |
| 회원 데이터 (기록, 그룹, 응원, 차단, 신고) | Supabase Postgres | `src/server/api.js` |
| 사진 (인증샷, 프로필, 그룹 사진) | Supabase Storage | 경로 규칙은 `src/server/storagePaths.js` |
| 로그인 | Supabase Auth | `src/server/auth.js`, `src/hooks/useAuth.js` |

지켜야 할 원칙은 세 가지입니다.

- 보안은 서버가 책임집니다. 모든 테이블에 RLS 가 걸려 있고, 화면에서 버튼을 숨기는 것은 편의일 뿐 보안이 아닙니다. 권한이 필요한 동작은 반드시 SQL 정책이나 서버 함수에서 다시 확인합니다.
- 운동 기록과 응원은 서버 검증 함수(RPC)로만 만듭니다. 클라이언트가 테이블에 직접 쓰지 않습니다.
- 서버 통신 코드는 `src/server/` 에만 둡니다. 화면 파일에서 `supabase` 를 직접 부르지 않습니다.

## 5. 자주 하는 작업

**새 화면 추가**
`src/pages/` 에 파일을 만들고, `src/lazyPages.js` 의 목록과 `src/App.jsx` 의 화면 전환 부분에 추가합니다.

**서버에서 데이터를 읽거나 쓰는 기능 추가**
`src/server/api.js` 에 함수를 추가합니다. 조회 함수는 비회원이면 빈 값을 돌려주고, 사용자가 누른 동작은 실패하면 한국어 문구를 담은 `Error` 를 던지는 규칙을 따릅니다. 추가한 함수는 `docs/API.md` 의 목록에도 적습니다.

**DB 구조나 권한 변경**
`supabase/` 에 새 SQL 파일을 만들고(다시 실행해도 안전하게 작성), `supabase/tests/run.sh` 의 실행 순서와 `docs/SUPABASE_SETUP.md` 에 추가합니다. 권한이 걸린 변경은 `supabase/tests/` 에 테스트를 함께 씁니다. 운영 DB 에는 Supabase 대시보드의 SQL Editor 에서 직접 실행합니다.

**Edge Function 수정**
`supabase/functions/` 를 고친 뒤 직접 배포해야 반영됩니다. git push 로는 배포되지 않습니다.

```bash
npx supabase functions deploy 함수이름
```

**색, 글자 크기, 간격 변경**
`src/index.css` 의 토큰만 고칩니다. 화면 파일에 임의의 색이나 크기를 넣지 않습니다. 글자 크기는 6단계, 간격은 4와 8의 배수만 씁니다. 로딩 화면은 앱 CSS 보다 먼저 떠야 해서 색 값이 `index.html` 에 한 번 더 적혀 있으니 함께 고칩니다.

**로딩 화면 디자인 변경**
`index.html` 의 `#splash` 를 고친 뒤 아이폰 시작 이미지를 다시 만듭니다. macOS 의 Google Chrome 이 필요합니다.

```bash
npm run splash
```

**앱 아이콘 변경**
`scripts/make-app-icons.mjs` 의 그림을 고친 뒤 다시 만듭니다. 아이콘은 네 모서리까지 꽉 찬 정사각형이어야 합니다. 휴대폰이 알아서 둥글게 자르기 때문에, 바깥에 여백이 있으면 홈 화면에 테두리로 보입니다.

```bash
npm run icons
```

**글꼴 버전 변경**
`index.html` 의 글꼴 주소를 바꾸면 `integrity` 해시도 새로 계산해 넣어야 합니다. 해시가 다르면 브라우저가 글꼴을 거부합니다. 계산 방법은 그 줄 위 주석에 있습니다.

## 6. 릴리스와 배포

1. 코드를 고치면서 `docs/CHANGELOG.md` 맨 위에 변경 사항을 적습니다. 서버 함수나 API 가 바뀌면 `docs/API.md` 도 함께 고칩니다.
2. `npm run check` 가 통과하는지 확인합니다.
3. 기능 커밋을 만들고, 버전을 올린 뒤 push 합니다.

```bash
git add .
git commit -m "feat: 변경 내용"
npm version patch
git push --follow-tags
```

`npm version patch` 는 버전 번호만 올리는 커밋과 태그를 따로 만듭니다. 설정 화면 아래에 표시되는 버전이 이 값입니다.

배포 위치가 세 군데라는 점을 기억해야 합니다.

| 무엇 | 어떻게 반영되나 |
| --- | --- |
| 화면 코드 (`src/`, `index.html`, `public/`) | main 에 push 하면 Vercel 이 자동 배포 |
| Edge Function (`supabase/functions/`) | `npx supabase functions deploy` 로 직접 배포 |
| SQL (`supabase/*.sql`) | Supabase SQL Editor 에서 직접 실행 |

환경 변수는 Vercel 프로젝트 설정에 있고, 바꾸면 재배포해야 반영됩니다.

## 7. 알아 둘 점과 한계

- **테마 규칙이 두 곳에 있음**: 첫 화면 깜빡임을 막으려고 `index.html` 의 스크립트와 `src/lib/theme.js` 가 같은 규칙(저장 키, 기본값 시스템)을 따로 갖고 있습니다. 한쪽을 고치면 다른 쪽도 고칩니다.
- **메일 발신 주소**: Supabase SMTP 가 임시로 개인 Gmail 로 연결돼 있습니다. 서비스 전용 계정으로 바꿀 예정이고, 대시보드의 SMTP 설정에서 주소와 앱 비밀번호만 바꾸면 됩니다. Gmail 은 하루 약 500통 제한이 있습니다.
- **운동 영상**: 지금은 외부 YouTube 재생목록에 의존합니다. 자체 3D 영상으로 바꾸는 작업이 `prototypes/situp-render/` 에서 진행 중입니다.
- **푸앙이 이스터에그**: 닉네임이 푸앙이 또는 푸앙이면 기본 프로필 사진이 바뀝니다(`src/lib/easterEggs.js`). 푸앙이는 중앙대학교 캐릭터라, 앱을 공개 배포하기 전에 사용 규정을 확인해야 합니다.
- **아이폰 시작 이미지는 다크만**: iOS 가 앱 설정을 읽기 전에 보여 주는 고정 이미지라, 라이트 테마 사용자는 앱을 열 때 잠깐 어두운 화면이 보입니다.
- **첫 다운로드 크기**: Supabase 라이브러리가 압축 기준 약 52KB 로 가장 큽니다. 로그인에 필요해서 첫 다운로드에서 뺄 수 없습니다.
- **콘텐츠 보안 정책(CSP)**: `vercel.json` 에 기본 보안 헤더는 있지만 스크립트 출처를 제한하는 정책은 아직 없습니다. `index.html` 의 인라인 스크립트와 외부 서비스(YouTube, Turnstile, Vercel Analytics) 때문에 도입하려면 충분한 확인이 필요합니다.
- **화면 테스트 없음**: 단위 테스트는 계산과 규칙(`lib`, `server`)을, DB 테스트는 권한을 검증합니다. 화면 동작은 자동 테스트가 없어 직접 눌러 확인해야 합니다.
- **관리자 지정**: 관리자는 DB 의 `profiles.role` 을 `admin` 으로 바꿔서 지정합니다. 화면에서 지정하는 기능은 없습니다.

## 8. 글쓰기 규칙

화면 문구, 주석, 문서 모두 같은 규칙을 따릅니다.

- 화살표 기호를 쓰지 않습니다. 순서는 문장이나 번호 목록으로, 메뉴 경로는 "설정의 기타 메뉴"처럼 씁니다.
- 가운뎃점은 되도록 쓰지 않습니다. 나열은 쉼표나 "와", "또는"으로 씁니다. 화면의 짧은 데이터 줄 구분자로 쓸 때만 양옆을 한 칸씩 띄웁니다.
- 사용자에게 보이는 문구는 해요체로, 무엇이 일어났고 다음에 무엇을 하면 되는지 한두 문장으로 씁니다.
