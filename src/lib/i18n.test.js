// 언어 기능 검사
// 1) 화면 코드에 t() 를 거치지 않은 한국어가 남아 있지 않은지 (영어 화면에 한국어가 섞이지 않게)
// 2) t() 에 쓴 모든 한국어 문구에 영어 번역이 있는지
// 3) 서버(DB 함수, Edge Function, 자체 API 서버)가 보내는 한국어 문구가 모두 영어로 바뀌는지
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import EN, { SERVER_PATTERNS } from './i18n.en.js'
import { setLanguageForTest, t, tServer, tSplit, weekdayShort } from './i18n.js'

const HANGUL = /[가-힣]/
const ROOT = join(import.meta.dirname, '..', '..')

// 한국어가 그대로 있어도 되는 파일: 번역표, 언어 이름(한국어), 이스터에그 닉네임, 한국어 약관 본문
const ALLOWED = ['src/lib/i18n.en.js', 'src/lib/i18n.js', 'src/lib/easterEggs.js', 'src/components/legal/ko.jsx']

function files(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`
    if (statSync(join(ROOT, rel)).isDirectory()) return files(rel)
    return /\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name) ? [rel] : []
  })
}

// 주석과 정규식 속 한글 범위([가-힣])를 지움 (글자 수는 유지해 위치가 어긋나지 않게)
function stripComments(src) {
  const blank = (m) => m.replace(/[^\n]/g, ' ')
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const two = src.slice(i, i + 2)
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (c === '/' && two !== '//' && two !== '/*' && /[(,=:[!&|?;]$/.test(out.trimEnd())) {
      // 정규식 글자 /.../ 는 그대로 건너뜀 (안의 따옴표를 문자열로 오해하지 않게)
      let j = i + 1
      let inClass = false
      while (j < src.length && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') j += 1
        else if (src[j] === '[') inClass = true
        else if (src[j] === ']') inClass = false
        j += 1
      }
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (two === '/*') {
      const j = src.indexOf('*/', i + 2)
      out += blank(src.slice(i, j + 2))
      i = j + 2
    } else if (two === '//' && src[i - 1] !== ':') {
      const j = src.indexOf('\n', i)
      const end = j === -1 ? src.length : j
      out += blank(src.slice(i, end))
      i = end
    } else {
      out += c
      i += 1
    }
  }
  return out.replace(/가-힣/g, '    ')
}

// t( 또는 tSplit( 의 괄호 안 범위들
function callRanges(src) {
  const ranges = []
  const re = /\b(t|tSplit)\(/g
  let m
  while ((m = re.exec(src))) {
    let depth = 1
    let j = m.index + m[0].length
    while (j < src.length && depth) {
      const c = src[j]
      if (c === "'" || c === '"' || c === '`') {
        let k = j + 1
        while (k < src.length && src[k] !== c) k += src[k] === '\\' ? 2 : 1
        j = k + 1
        continue
      }
      if (c === '(') depth += 1
      if (c === ')') depth -= 1
      j += 1
    }
    ranges.push([m.index, j])
  }
  return ranges
}

// 한글이 들어 있는 문자열 조각 (따옴표 안의 내용)
function hangulStrings(text) {
  const found = []
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g
  let m
  while ((m = re.exec(text))) {
    const s = (m[1] ?? m[2]).replace(/\\n/g, '\n').replace(/\\(.)/g, '$1')
    if (HANGUL.test(s)) found.push(s)
  }
  return found
}

function scan() {
  const leftovers = []
  const keys = new Set()
  for (const file of files('src')) {
    if (ALLOWED.includes(file)) continue
    const src = stripComments(readFileSync(join(ROOT, file), 'utf8'))
    let outside = src
    for (const [a, b] of callRanges(src)) {
      hangulStrings(src.slice(a, b)).forEach((k) => keys.add(k))
      outside = outside.slice(0, a) + ' '.repeat(b - a) + outside.slice(b)
    }
    outside.split('\n').forEach((line, i) => {
      if (HANGUL.test(line)) leftovers.push(`${file}:${i + 1}: ${line.trim()}`)
    })
  }
  return { leftovers, keys: [...keys] }
}

afterEach(() => setLanguageForTest('ko'))

describe('화면 문구가 모두 번역을 거침', () => {
  const { leftovers, keys } = scan()

  it('t() 를 거치지 않은 한국어가 없다', () => {
    expect(leftovers).toEqual([])
  })
  it('t() 에 쓴 한국어 문구마다 영어 번역이 있다', () => {
    expect(keys.filter((k) => !(k in EN))).toEqual([])
  })
  it('영어 번역에 한국어가 섞여 있지 않다', () => {
    const bad = Object.entries(EN).filter(([, v]) => typeof v === 'string' && HANGUL.test(v))
    expect(bad).toEqual([])
  })
  it('검사가 실제로 문구를 찾는다 (검사 자체가 고장 나 늘 통과하지 않게)', () => {
    expect(keys.length).toBeGreaterThan(400)
  })
})

describe('번역 함수', () => {
  it('기본은 한국어 원문, 구분 표시(|) 앞부분은 보이지 않음', () => {
    expect(t('로그인이 필요해요.')).toBe('로그인이 필요해요.')
    expect(t('횟수|회')).toBe('회')
    expect(t('멤버 {count}/{max}명', { count: 3, max: 10 })).toBe('멤버 3/10명')
  })
  it('영어로 바꾸면 번역문, 값 끼워 넣기, 단수와 복수', () => {
    setLanguageForTest('en')
    expect(t('로그인이 필요해요.')).toBe('Please sign in.')
    expect(t('멤버 {count}/{max}명', { count: 3, max: 10 })).toBe('3/10 members')
    expect(t('큰숫자|{n}일', { n: 1 })).toBe('1 day')
    expect(t('큰숫자|{n}일', { n: 12 })).toBe('12 days')
    expect(weekdayShort(1)).toBe('M')
  })
  it('tSplit: 강조할 값 앞뒤로 문장을 나눔 (언어마다 순서가 달라도)', () => {
    expect(tSplit('연속 {n}일째,', 'n', { n: 5 })).toEqual(['연속 ', '일째,'])
    setLanguageForTest('en')
    expect(tSplit('연속 {n}일째,', 'n', { n: 5 })).toEqual(['', '-day streak!'])
    expect(tSplit('큰숫자|{n}일', 'n', { n: 1 })).toEqual(['', ' day'])
  })
})

describe('서버 문구 번역', () => {
  // DB 함수의 raise exception 문구와 Edge Function, 자체 API 서버의 오류 문구를 저장소에서 직접 모음
  const sqlDir = join(ROOT, 'supabase')
  const sql = readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(sqlDir, f), 'utf8'))
    .join('\n')
  const raised = [...sql.matchAll(/raise exception '([^']*[가-힣][^']*)'/g)].map((m) =>
    m[1].replace(/^absolid:\s*/, '').replace(/%/g, '3'),
  )
  const serverFiles = [
    ...files('server'),
    ...readdirSync(join(ROOT, 'supabase/functions'))
      .filter((d) => d !== '_shared' && statSync(join(ROOT, 'supabase/functions', d)).isDirectory())
      .map((d) => `supabase/functions/${d}/index.ts`),
  ]
  const sent = serverFiles.flatMap((f) =>
    [...readFileSync(join(ROOT, f), 'utf8').matchAll(/error: '([^']*[가-힣][^']*)'/g)].map((m) => m[1]),
  )

  it('한국어 화면에서는 그대로', () => {
    expect(tServer('로그인이 필요해요.')).toBe('로그인이 필요해요.')
    expect(tServer('absolid: 일회용 이메일로는 가입할 수 없어요.')).toBe('일회용 이메일로는 가입할 수 없어요.')
  })
  it('영어 화면에서는 모든 서버 문구가 한국어 없이 바뀜', () => {
    setLanguageForTest('en')
    expect(raised.length + sent.length).toBeGreaterThan(30)
    const untranslated = [...raised, ...sent].filter((m) => HANGUL.test(tServer(m)))
    expect(untranslated).toEqual([])
  })
  it('숫자가 들어간 문구와 모르는 문구', () => {
    setLanguageForTest('en')
    expect(tServer('영상을 끝까지 시청해야 완료로 기록돼요. 약 3분 남았어요.')).toBe(
      'Watch the video to the end to record it. About 3 min left.',
    )
    expect(tServer('이 그룹은 정원(10명)이 가득 찼어요.')).toBe('This group is full (10 members).')
    expect(tServer('처음 보는 한국어 문구')).toBe(EN['일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'])
    expect(tServer('Already English')).toBe('Already English')
    expect(SERVER_PATTERNS.length).toBeGreaterThan(0)
  })
})
