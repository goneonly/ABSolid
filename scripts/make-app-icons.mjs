// 홈 화면 앱 아이콘 만들기 (아이폰 apple-touch-icon, 안드로이드 icon-192/512, maskable)
// 실행: npm run icons   (macOS 의 Google Chrome 과 sips 필요)
//
// 휴대폰은 아이콘을 받아서 스스로 둥글게 잘라 쓰므로, 이미지는 네 모서리까지 빨간색으로 꽉 찬 정사각형이어야 함.
// (예전 아이콘은 빨간 둥근 사각형 바깥이 검은색이나 투명이라 홈 화면에서 검은 테두리로 보였음)
// 아이콘을 다시 만들면 index.html 의 apple-touch-icon 과 public/manifest.webmanifest 의 ?v= 숫자를 하나 올려야 휴대폰에 반영됨
// "A" 는 가운데 40% 안쪽에 있어서 안드로이드 maskable 의 안전 영역(지름 80% 원)에도 들어감. 그래서 같은 그림을 그대로 씀
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PUBLIC = new URL('../public/', import.meta.url).pathname
const SIZE = 512 // 크게 그린 뒤 줄임 (헤드리스 Chrome 창은 최소 약 500px)

// public/favicon.svg 와 같은 "A" (viewBox 를 빨간 사각형 크기에 맞춰 여백 없이)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 24 24" width="${SIZE}" height="${SIZE}">
  <rect x="1" y="1" width="24" height="24" fill="#ff3b30" />
  <path d="M8 18 L13 7 L18 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <path d="M10 14.5 H16" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
</svg>`

const tmp = mkdtempSync(join(tmpdir(), 'absolid-icons-'))
try {
  const page = join(tmp, 'icon.html')
  writeFileSync(page, `<!doctype html><html><body style="margin:0;background:#ff3b30">${svg}</body></html>`)
  const master = join(PUBLIC, 'icon-512.png')
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${SIZE},${SIZE}`,
      `--screenshot=${master}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  )
  const copies = [
    ['icon-maskable-512.png', 512],
    ['icon-192.png', 192],
    ['apple-touch-icon.png', 180],
  ]
  for (const [file, size] of copies) {
    execFileSync('sips', ['-z', String(size), String(size), master, '--out', join(PUBLIC, file)], { stdio: 'ignore' })
    console.log(`${file} (${size}px)`)
  }
  console.log('icon-512.png (512px)')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
