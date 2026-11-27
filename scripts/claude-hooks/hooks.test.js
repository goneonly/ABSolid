// Claude Code 훅의 판단 규칙 검사 (hooks.mjs)
import { describe, expect, it } from 'vitest'
import {
  checkBash,
  checkEdit,
  checkText,
  needsI18nCheck,
  pairReminders,
  shouldFormat,
  stopReminders,
} from './hooks.mjs'

const ROOT = '/repo'

describe('명령 실행 전 (git 작업, 삭제)', () => {
  it('커밋, 푸시, 합치기, 되돌리기, PR 만들기는 막음', () => {
    for (const cmd of [
      'git commit -m "x"',
      'git push -u origin feat/a',
      'cd ~/git/ABSolid && git push',
      'git merge origin/main',
      'git rebase main',
      'git reset --hard HEAD~1',
      'git -C /repo tag v1.0.0',
      'gh pr create --fill',
      'gh pr merge 12',
    ]) {
      expect(checkBash(cmd)?.decision, cmd).toBe('deny')
    }
  })
  it('조회 명령은 그대로 둠 (merge-tree, merge-base 포함)', () => {
    for (const cmd of [
      'git status -sb',
      'git log --oneline -3',
      'git fetch -q origin',
      'git diff --stat',
      'git merge-tree --write-tree origin/main HEAD',
      'git merge-base --is-ancestor a b',
      'npx vitest run',
    ]) {
      expect(checkBash(cmd), cmd).toBeNull()
    }
  })
  it('지우거나 되돌리는 명령은 허락을 물음', () => {
    for (const cmd of [
      'rm dev.html',
      'cd x && rm -rf dist',
      'git clean -fd',
      'git restore src/a.js',
      'git checkout -- src/a.js',
      'find . -name "*.tmp" -delete',
    ]) {
      expect(checkBash(cmd)?.decision, cmd).toBe('ask')
    }
  })
  it('파일에 쓰는 글(heredoc) 안의 git 명령 글자는 명령으로 보지 않음', () => {
    expect(checkBash("cat >> docs/A.md <<'EOF'\n`git commit`, `push` 를 막음\nEOF\ngrep -n x docs/A.md")).toBeNull()
    expect(checkBash('cat > a.txt <<EOF\nrm 설명\nEOF')).toBeNull()
    expect(checkBash("cat > a.txt <<'EOF'\nhi\nEOF\ngit push")?.decision).toBe('deny')
  })
  it('rm 이 낱말 일부일 때는 묻지 않음', () => {
    expect(checkBash('npm run format')).toBeNull()
    expect(checkBash('echo confirm done')).toBeNull()
  })
})

describe('파일 수정 전 (비밀 값, 3D 폴더)', () => {
  it('.env 는 고치지 않음, .env.example 은 허용', () => {
    expect(checkEdit('/repo/.env', 'A=1', ROOT)?.decision).toBe('deny')
    expect(checkEdit('/repo/.env.local', 'A=1', ROOT)?.decision).toBe('deny')
    expect(checkEdit('/repo/.env.example', 'A=', ROOT)).toBeNull()
  })
  it('비밀 값처럼 보이는 내용은 막음', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnopqrstuvwxyz'
    expect(checkEdit('/repo/src/a.js', `const k = '${jwt}'`, ROOT)?.decision).toBe('deny')
    expect(checkEdit('/repo/server/a.js', 'SUPABASE_SERVICE_ROLE_KEY=abcdefghijklmnop1234', ROOT)?.decision).toBe(
      'deny',
    )
    expect(checkEdit('/repo/a.pem', '-----BEGIN PRIVATE KEY-----', ROOT)?.decision).toBe('deny')
  })
  it('환경 변수 이름만 쓰는 코드는 허용', () => {
    expect(checkEdit('/repo/server/a.js', 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY', ROOT)).toBeNull()
  })
  it('3D 담당 폴더는 허락을 물음', () => {
    expect(checkEdit('/repo/prototypes/situp-render/render.py', 'x', ROOT)?.decision).toBe('ask')
  })
})

describe('새로 쓴 내용 (화살표, 가운뎃점, 색 값)', () => {
  it('화살표 기호를 찾음', () => {
    expect(checkText('docs/a.md', '설정 → 기타')).toHaveLength(1)
    expect(checkText('src/a.jsx', "t('다음 ⇒')")).toHaveLength(1)
    expect(checkText('docs/a.md', '설정 -> 기타')).toHaveLength(1)
  })
  it('공유 버튼 그림(네모와 위쪽 화살표), 코드의 => 와 SQL 의 ->> 는 허용', () => {
    expect(checkText('src/a.jsx', "t('공유 버튼(□↑)을 눌러요.')")).toEqual([])
    expect(checkText('src/a.js', 'const f = (x) => x')).toEqual([])
    expect(checkText('supabase/a.sql', "select data->>'name'")).toEqual([])
  })
  it('붙여 쓴 가운뎃점은 알리고, 띄어 쓴 것은 허용', () => {
    expect(checkText('docs/a.md', '이름·전화')).toHaveLength(1)
    expect(checkText('docs/a.md', '이름 · 전화')).toEqual([])
    expect(checkText('src/a.jsx', "<strong>1위</strong> ·{' '}")).toEqual([])
  })
  it('화면 코드(src 의 .jsx)에 직접 쓴 색 값을 찾음', () => {
    expect(checkText('src/components/A.jsx', 'style={{ color: "#ff0000" }}')).toHaveLength(1)
    expect(checkText('src/components/A.jsx', 'className="text-dim"')).toEqual([])
    expect(checkText('scripts/a.mjs', "const c = '#ffffff'")).toEqual([])
  })
})

describe('짝 파일 알림', () => {
  it('약관 원본과 영어판, 스켈레톤, API 문서', () => {
    expect(pairReminders('src/components/legal/ko.jsx')[0]).toContain('en.jsx')
    expect(pairReminders('src/components/legal/en.jsx')[0]).toContain('ko.jsx')
    expect(pairReminders('src/pages/group/MemberRow.jsx')[0]).toContain('skeletons.jsx')
    expect(pairReminders('server/app.js')[0]).toContain('docs/API.md')
    expect(pairReminders('src/pages/Home.jsx')).toEqual([])
  })
})

describe('자동 정렬 범위', () => {
  it('package.json 의 format 과 같은 폴더의 코드만', () => {
    expect(shouldFormat('src/pages/Home.jsx')).toBe(true)
    expect(shouldFormat('server/app.js')).toBe(true)
    expect(shouldFormat('scripts/claude-hooks/hooks.mjs')).toBe(true)
    expect(shouldFormat('docs/CHANGELOG.md')).toBe(false)
    expect(shouldFormat('supabase/v0.12-group-kick.sql')).toBe(false)
  })
})

describe('작업을 끝낼 때', () => {
  it('코드를 바꾸고 변경 기록을 안 적었으면 알림, 적었으면 조용', () => {
    expect(stopReminders([' M src/pages/Home.jsx'])).toHaveLength(1)
    expect(stopReminders([' M src/pages/Home.jsx', ' M docs/CHANGELOG.md'])).toEqual([])
  })
  it('테스트만 바꾼 경우는 변경 기록을 요구하지 않음', () => {
    expect(stopReminders([' M server/app.test.js'])).toEqual([])
  })
  it('서버 주소를 바꾸고 API 문서를 안 고쳤으면 알림', () => {
    const r = stopReminders([' M server/app.js', ' M docs/CHANGELOG.md'])
    expect(r).toHaveLength(1)
    expect(r[0]).toContain('docs/API.md')
  })
  it('새 SQL 이 run.sh 목록에 없으면 알림, 있으면 조용', () => {
    const changed = ['?? supabase/v0.13-new.sql', ' M docs/CHANGELOG.md']
    expect(stopReminders(changed, 'MIGRATIONS=(schema v0.12-group-kick)')).toHaveLength(1)
    expect(stopReminders(changed, 'MIGRATIONS=(schema v0.13-new)')).toEqual([])
  })
  it('화면, 서버, DB 파일이 바뀌면 영어 번역 검사를 돌림', () => {
    expect(needsI18nCheck([' M src/a.jsx'])).toBe(true)
    expect(needsI18nCheck(['?? supabase/v1.sql'])).toBe(true)
    expect(needsI18nCheck([' M docs/PLAN.md'])).toBe(false)
  })
})
