// Claude Code 훅: 프로젝트 규칙(docs/CONVENTIONS.md)을 사람 기억 대신 자동으로 지키게 하는 검사
// 설정은 .claude/settings.json(함께 씀)과 .claude/settings.local.json(내 컴퓨터만), 설명은 CONVENTIONS 9절
//
// 실행: node scripts/claude-hooks/hooks.mjs <단계>   (Claude Code 가 표준 입력으로 JSON 을 넘김)
//   pre-bash   명령 실행 전: git 커밋, 푸시 등 막기, 삭제는 허락 묻기
//   pre-edit   파일 수정 전: .env 와 비밀 값 막기, 3D 담당 폴더는 허락 묻기
//   post-edit  파일 수정 후: 자동 정렬, 화살표와 가운뎃점, 색 값, 짝 파일 알림
//   stop       작업을 끝낼 때: 영어 번역 검사, 변경 기록과 API 문서, 새 SQL 등록
// 판단 함수는 모두 export 해서 hooks.test.js 가 검사함
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── 1, 2. 명령 실행 전 ─────────────────────────
// git 으로 기록을 남기거나 GitHub 에 올리는 일은 사람이 직접 함 (merge-tree, merge-base, 태그 목록 같은 조회는 허용)
const GIT_WRITE =
  /\bgit\s+(?:-C\s+\S+\s+)?(?:(?:commit|push|merge(?![-\w])|rebase|cherry-pick|revert|reset\s+--hard|am)\b|tag\s+(?:-[adsf]\b|[^-\s]))|\bgh\s+pr\s+(?:create|merge|close)\b/
// 지우거나 되돌리는 명령은 매번 허락을 물음
const DELETE =
  /(?:^|[\s;&|(])(?:rm|rmdir|unlink)\s|\bgit\s+(?:clean|rm|restore)\b|\bgit\s+checkout\s+--(?:\s|$)|\bfind\b[^|;&]*\s-delete\b/

// 파일에 쓰는 글(heredoc 본문)은 명령이 아니므로 빼고 봄 (문서에 적힌 'git commit' 글자로 막히지 않게)
const HEREDOC = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g
export const commandPart = (command) => command.replace(HEREDOC, '<<heredoc')

export function checkBash(raw = '') {
  const command = commandPart(raw)
  if (GIT_WRITE.test(command)) {
    return {
      decision: 'deny',
      reason:
        'git 커밋, 푸시, 합치기 같은 GitHub 작업은 사용자만 해요. 실행할 명령을 bash 코드 블록으로 안내해 주세요.',
    }
  }
  if (DELETE.test(command)) {
    return { decision: 'ask', reason: '파일을 지우거나 되돌리는 명령이에요. 지울 목록을 확인한 뒤 허락해 주세요.' }
  }
  return null
}

// ── 5, 11. 파일 수정 전 ────────────────────────
const SECRETS = [
  [/eyJ[\w-]{20,}\.eyJ[\w-]{20,}\.[\w-]{20,}/, '로그인 토큰이나 Supabase 키(JWT)'],
  [/\bsb_secret_[\w-]{10,}/, 'Supabase 비밀 키'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, '개인 키'],
  [
    /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|CRON_SECRET)\s*[=:]\s*['"]?[\w./+-]{16,}/,
    '서버 비밀 값',
  ],
]

export function checkEdit(path, text = '', root = process.cwd()) {
  const rel = relative(root, path).split(sep).join('/')
  const name = basename(path)
  if (/^\.env(?:\..+)?$/.test(name) && name !== '.env.example') {
    return {
      decision: 'deny',
      reason: `${name} 에는 비밀 값이 있어 고치지 않아요. 바꿀 값은 사용자에게 안내해 주세요.`,
    }
  }
  for (const [re, label] of SECRETS) {
    if (re.test(text)) {
      return {
        decision: 'deny',
        reason: `${label}처럼 보이는 값이 들어 있어요. 비밀 값은 저장소에 넣지 않고 .env 나 Vercel 환경 변수에 둬요.`,
      }
    }
  }
  if (rel.startsWith('prototypes/')) {
    return { decision: 'ask', reason: 'prototypes/ 는 3D 영상 담당 폴더예요. 고쳐도 되는지 확인해 주세요.' }
  }
  return null
}

// ── 4, 10. 새로 쓴 내용의 글쓰기, 색 규칙 ───────
const ARROWS = /[←-⇿⟰-⟿⤀-⥿⬀-⬑⭠-⯿]/g
const ARROW_OK = ['\u25a1\u2191'] // 네모와 위쪽 화살표: 아이폰 공유 버튼 모양을 글자로 그린 것 (화살표 뜻이 아님)
const TIGHT_DOT = /\S\u00b7|\u00b7(?!\s|\{' '\}|$)/m // 가운뎃점(U+00B7)
const HEX_COLOR = /['"`]#[0-9a-fA-F]{3,8}\b|:\s*#[0-9a-fA-F]{3,8}\b/

export function checkText(path, text = '') {
  const problems = []
  let arrows = text
  for (const ok of ARROW_OK) arrows = arrows.split(ok).join('')
  if (ARROWS.test(arrows)) problems.push('화살표 기호를 썼어요. 순서는 문장이나 번호 목록으로 써 주세요.')
  ARROWS.lastIndex = 0
  if (extname(path) === '.md' && /\s->\s/.test(text)) {
    problems.push("문서에 '->' 화살표를 썼어요. 문장이나 번호 목록으로 써 주세요.")
  }
  if (TIGHT_DOT.test(text)) problems.push('가운뎃점은 되도록 쓰지 말고, 쓸 때는 양옆을 한 칸씩 띄워 주세요.')
  if (/\.jsx$/.test(path) && /(^|\/)src\//.test(path) && HEX_COLOR.test(text)) {
    problems.push('색 값을 코드에 직접 썼어요. src/index.css 의 테마 색(bg-surface, text-dim 등)을 써 주세요.')
  }
  return problems
}

// ── 9. 짝 파일 알림 ────────────────────────────
const SKELETON_PAIRS = [
  'src/pages/group/MemberRow.jsx',
  'src/components/RankBoard.jsx',
  'src/components/Leaderboard.jsx',
  'src/pages/Group.jsx',
  'src/pages/group/GroupDetail.jsx',
  'src/pages/settings/BlockedUsersModal.jsx',
  'src/pages/settings/ProfileModals.jsx',
]

export function pairReminders(rel) {
  const out = []
  if (rel === 'src/components/legal/ko.jsx') {
    out.push(
      '약관 원본을 고쳤어요. src/components/legal/en.jsx 영어판과 src/lib/terms.js 의 TERMS_VERSION(시행일)도 함께 고쳐 주세요.',
    )
  }
  if (rel === 'src/components/legal/en.jsx') {
    out.push('약관 영어판을 고쳤어요. 원본 src/components/legal/ko.jsx 와 내용이 같은지 확인해 주세요.')
  }
  if (SKELETON_PAIRS.includes(rel)) {
    out.push('이 화면의 모양을 바꿨다면 src/components/skeletons.jsx 의 짝 스켈레톤도 같은 크기로 맞춰 주세요.')
  }
  if (rel === 'server/app.js') out.push('API 주소를 바꿨다면 docs/API.md 도 함께 고쳐 주세요.')
  return out
}

// ── 6. 자동 정렬 범위 (package.json 의 format 과 같은 폴더) ──
const FORMAT_DIRS = ['src/', 'server/', 'api/', 'supabase/functions/', 'scripts/']
const FORMAT_EXTS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.json']
export const shouldFormat = (rel) => FORMAT_DIRS.some((d) => rel.startsWith(d)) && FORMAT_EXTS.includes(extname(rel))

// ── 3, 7, 8. 작업을 끝낼 때 ─────────────────────
// changed: git status --porcelain 의 줄들. 반환: 고칠 일 목록 (i18n 검사는 따로)
export function stopReminders(changed, runSh = '') {
  const files = changed.map((l) => ({ code: l.slice(0, 2), path: l.slice(3).split(' -> ').pop() }))
  const has = (p) => files.some((f) => f.path === p)
  const code = files.filter(
    (f) => /^(src|server|api)\/.+\.(jsx?|mjs)$/.test(f.path) || /^supabase\/.+\.sql$/.test(f.path),
  )
  const out = []
  if (code.some((f) => !/\.test\.(jsx?|sql)$/.test(f.path)) && !has('docs/CHANGELOG.md')) {
    out.push("코드를 바꿨는데 docs/CHANGELOG.md 의 '다음 버전'에 적지 않았어요.")
  }
  if (has('server/app.js') && !has('docs/API.md')) {
    out.push('server/app.js 를 바꿨는데 docs/API.md 는 그대로예요. 주소나 응답이 바뀌었다면 함께 고쳐 주세요.')
  }
  for (const f of files) {
    const m = /^supabase\/([^/]+)\.sql$/.exec(f.path)
    if (m && (f.code.includes('?') || f.code.includes('A')) && !runSh.includes(m[1])) {
      out.push(
        `새 SQL ${f.path} 이 supabase/tests/run.sh 의 MIGRATIONS 목록에 없어요. 넣어야 DB 검사가 이 파일을 적용해요.`,
      )
    }
  }
  return out
}

export const needsI18nCheck = (changed) => changed.some((l) => /^(src|server|supabase)\//.test(l.slice(3)))

// ── 실행부 ─────────────────────────────────────
const print = (obj) => process.stdout.write(JSON.stringify(obj))

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

// 지난번 작업 종료 때와 바뀐 게 없으면 같은 알림을 다시 하지 않음 (질문에만 답한 턴 등)
function unchangedSinceLastStop(root, sessionId) {
  const state = git(root, ['status', '--porcelain', '--untracked-files=all']) + git(root, ['diff', 'HEAD'])
  const hash = createHash('sha1').update(state).digest('hex')
  const dir = join(tmpdir(), 'absolid-claude-hooks')
  const file = join(dir, `${sessionId || 'session'}.txt`)
  const same = existsSync(file) && readFileSync(file, 'utf8') === hash
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, hash)
  return same
}

function main(stage, input) {
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
  const tool = input.tool_input || {}
  const path = tool.file_path || tool.notebook_path || ''
  const newText = tool.content ?? tool.new_string ?? (tool.edits || []).map((e) => e.new_string).join('\n')

  if (stage === 'pre-bash' || stage === 'pre-edit') {
    const r = stage === 'pre-bash' ? checkBash(tool.command) : checkEdit(path, newText, root)
    if (r) {
      print({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: r.decision,
          permissionDecisionReason: r.reason,
        },
      })
    }
    return
  }

  if (stage === 'post-edit') {
    const rel = relative(root, path).split(sep).join('/')
    if (!path || rel.startsWith('..')) return // 프로젝트 밖 파일(임시 폴더 등)은 검사하지 않음
    if (shouldFormat(rel)) {
      spawnSync(join(root, 'node_modules/.bin/prettier'), ['--write', '--log-level', 'silent', path], { cwd: root })
    }
    const problems = checkText(rel, newText)
    const reminders = pairReminders(rel)
    if (problems.length) {
      print({ decision: 'block', reason: `${rel}: ${[...problems, ...reminders].join(' ')}` })
    } else if (reminders.length) {
      print({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reminders.join(' ') } })
    }
    return
  }

  if (stage === 'stop') {
    if (input.stop_hook_active) return // 한 번 알렸으면 다시 막지 않음 (무한 반복 방지)
    if (unchangedSinceLastStop(root, input.session_id)) return
    const changed = git(root, ['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean)
    if (!changed.length) return
    const runSh = existsSync(join(root, 'supabase/tests/run.sh'))
      ? readFileSync(join(root, 'supabase/tests/run.sh'), 'utf8')
      : ''
    const todo = stopReminders(changed, runSh)
    if (needsI18nCheck(changed)) {
      const r = spawnSync(join(root, 'node_modules/.bin/vitest'), ['run', 'src/lib/i18n.test.js'], {
        cwd: root,
        encoding: 'utf8',
      })
      if (!r.error && r.status !== 0) {
        // r.error: vitest 를 실행하지 못함 (npm install 전 등). 그때는 검사를 건너뜀
        const lines = `${r.stdout}${r.stderr}`
          .split('\n')
          .filter((l) => /^\s*[+-]\s+"/.test(l))
          .slice(0, 10)
        todo.unshift(`영어 번역 검사(src/lib/i18n.test.js)가 실패했어요. ${lines.join(' ').trim()}`)
      }
    }
    if (todo.length) {
      print({
        decision: 'block',
        reason: `끝내기 전에 확인해 주세요. ${todo.join(' ')} (이번 변경에 해당하지 않으면 이유를 말하고 끝내도 돼요)`,
      })
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let raw = ''
  process.stdin.on('data', (c) => (raw += c))
  process.stdin.on('end', () => {
    let input = {}
    try {
      input = JSON.parse(raw || '{}')
    } catch {
      /* 입력이 이상하면 아무것도 하지 않음 (작업을 막지 않음) */
    }
    try {
      main(process.argv[2], input)
    } catch {
      /* 훅 자체의 오류로 작업이 멈추지 않게 */
    }
  })
}
