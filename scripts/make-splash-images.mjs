// 아이폰 홈 화면 앱 시작 이미지(apple-touch-startup-image) 만들기
// 실행: node scripts/make-splash-images.mjs   (macOS 의 Google Chrome 필요)
//
// index.html 의 로딩 화면(#splash)을 헤드리스 Chrome 으로 기기 크기마다 그대로 찍음.
// 애니메이션 첫 장면(빨간 사각형만, "A", 글자는 아직 안 보임)으로 고정해서 찍기 때문에
// iOS 가 시작 이미지에서 실제 로딩 화면으로 바꿀 때 같은 자리에서 "A"가 그려지기 시작함 (튀는 장면 없음).
// 로딩 화면 디자인을 바꾸면 이 스크립트를 다시 실행하면 됨 — 이미지와 index.html 의 <link> 목록을 함께 갱신.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT = new URL('..', import.meta.url).pathname
const OUT_DIR = join(ROOT, 'public/splash')
const INDEX = join(ROOT, 'index.html')

// 세로 화면 기준 CSS 크기, 배율, 하단 안전 영역(홈 인디케이터)
const DEVICES = [
  { w: 440, h: 956, dpr: 3, safe: 34, name: 'iPhone 16, 17 Pro Max' },
  { w: 430, h: 932, dpr: 3, safe: 34, name: 'iPhone 14, 15 Pro Max, 15, 16 Plus' },
  { w: 428, h: 926, dpr: 3, safe: 34, name: 'iPhone 12, 13 Pro Max, 14 Plus' },
  { w: 420, h: 912, dpr: 3, safe: 34, name: 'iPhone Air' },
  { w: 402, h: 874, dpr: 3, safe: 34, name: 'iPhone 16, 17 Pro, 17' },
  { w: 393, h: 852, dpr: 3, safe: 34, name: 'iPhone 14 Pro, 15, 15 Pro, 16' },
  { w: 390, h: 844, dpr: 3, safe: 34, name: 'iPhone 12, 13, 14, 16e' },
  { w: 375, h: 812, dpr: 3, safe: 34, name: 'iPhone X, XS, 11 Pro, 12, 13 mini' },
  { w: 414, h: 896, dpr: 3, safe: 34, name: 'iPhone XS Max, 11 Pro Max' },
  { w: 414, h: 896, dpr: 2, safe: 34, name: 'iPhone XR, 11' },
  { w: 414, h: 736, dpr: 3, safe: 0, name: 'iPhone 6, 7, 8 Plus' },
  { w: 375, h: 667, dpr: 2, safe: 0, name: 'iPhone SE 2, 3, 6, 7, 8' },
]

const html = readFileSync(INDEX, 'utf8')
const style = html.match(/<style>[\s\S]*?#splash[\s\S]*?<\/style>/)?.[0]
const markup = html.match(/<div id="splash"[\s\S]*?<div class="sp-bars"[\s\S]*?<\/div>\s*<\/div>/)?.[0]
const font = html.match(/<link\s+rel="stylesheet"[^>]*pretendard[^>]*>/)?.[0] || ''
if (!style || !markup) throw new Error('index.html 에서 #splash 스타일, 마크업을 찾지 못했어요.')

const page = (d) => `<!doctype html><html lang="ko" data-theme="dark"><head><meta charset="utf-8">
${font}${style}
<style>
  html, body { margin: 0; background: #141519; }
  #splash, #splash * { animation-play-state: paused !important; transition: none !important; }
  /* 헤드리스 Chrome 은 창 너비가 최소 약 500px 이라, 화면을 기기 크기로 고정해 왼쪽 위부터 찍음 */
  #splash { inset: 0 auto auto 0 !important; width: ${d.w}px; height: ${d.h}px; }
  #splash .sp-bars { bottom: ${44 + d.safe}px !important; }
</style></head><body>${markup}</body></html>`

mkdirSync(OUT_DIR, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'absolid-splash-'))
const links = []
try {
  for (const d of DEVICES) {
    const file = `apple-splash-${d.w * d.dpr}x${d.h * d.dpr}.png`
    const src = join(tmp, `${d.w}x${d.h}@${d.dpr}.html`)
    writeFileSync(src, page(d))
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        `--force-device-scale-factor=${d.dpr}`,
        `--window-size=${d.w},${d.h}`,
        '--virtual-time-budget=3000', // 글꼴 로딩 대기
        `--screenshot=${join(OUT_DIR, file)}`,
        `file://${src}`,
      ],
      { stdio: 'ignore' },
    )
    links.push(
      `    <link rel="apple-touch-startup-image" href="/splash/${file}" media="(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)" />`,
    )
    console.log(`✓ ${file}  (${d.name})`)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

// index.html 의 표시 사이에 <link> 목록 갱신
const START = '    <!-- splash-images:start (scripts/make-splash-images.mjs 가 생성) -->'
const END = '    <!-- splash-images:end -->'
const block = [START, ...links, END].join('\n')
const next = html.includes(START)
  ? html.replace(new RegExp(`${START.trim()}[\\s\\S]*?${END.trim()}`), block.trim())
  : html.replace('    <link rel="apple-touch-icon"', `${block}\n    <link rel="apple-touch-icon"`)
writeFileSync(INDEX, next)
console.log(`index.html 에 시작 이미지 ${links.length}개 연결`)
