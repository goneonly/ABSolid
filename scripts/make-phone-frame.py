"""소개 페이지(/about)의 휴대폰 틀 이미지 만들기.

흰 배경에 흰 화면으로 된 휴대폰 목업 사진에서 바깥 배경과 화면 부분을 투명하게 뚫어
틀만 남긴 이미지를 만든다. 화면 자리에는 소개 페이지가 실제 앱 화면을 끼워 넣는다.

실행: python3 scripts/make-phone-frame.py <원본 이미지> [결과 파일]
결과: public/about/phone-frame.webp 와, PhoneMockup.jsx 의 FRAME 상수에 넣을 숫자 (화면 위치, 비율)
필요: pip install pillow numpy

목업 사진을 바꾸면 이 스크립트를 다시 돌리고, 출력된 숫자를 src/pages/about/PhoneMockup.jsx 에 옮긴다.
"""

import sys
from collections import deque

import numpy as np
from PIL import Image

WHITE = 238  # 이 값 이상이면 흰 배경으로 봄
EDGE = 3  # 경계에서 반투명 처리할 두께(px)
OUT_HEIGHT = 1600  # 결과 이미지 높이


def flood(mask_white, seeds):
    """seeds 에서 시작해 이어진 흰 영역을 찾는다."""
    h, w = mask_white.shape
    seen = np.zeros((h, w), dtype=bool)
    queue = deque(s for s in seeds if mask_white[s])
    for s in queue:
        seen[s] = True
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and mask_white[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def grow(mask, n):
    """mask 를 n 픽셀 넓힌다."""
    out = mask.copy()
    for _ in range(n):
        g = out.copy()
        g[1:, :] |= out[:-1, :]
        g[:-1, :] |= out[1:, :]
        g[:, 1:] |= out[:, :-1]
        g[:, :-1] |= out[:, 1:]
        out = g
    return out


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else 'public/about/phone-frame.webp'
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    h, w, _ = rgb.shape
    white = rgb.min(axis=2) >= WHITE

    outside = flood(white, [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)])
    screen = flood(white, [(h // 2, w // 2)])
    assert not (outside & screen).any(), '화면과 바깥 배경이 이어져 있어요. 원본 이미지를 확인하세요.'
    hole = outside | screen

    # 투명도: 뚫는 곳은 0. 경계 띠는 흰색이 섞인 만큼만 덜어 내 계단 현상과 흰 테두리를 없앰
    alpha = np.ones((h, w), dtype=np.float32)
    alpha[hole] = 0
    band = grow(hole, EDGE) & ~hole
    a = (255 - rgb.min(axis=2)) / 255
    alpha[band] = np.clip(a[band] * 1.6, 0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    color = np.where(band[..., None], np.clip((rgb - 255 * (1 - safe)) / safe, 0, 255), rgb)

    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)

    # 휴대폰만 남기고 자름
    ys, xs = np.where(~outside)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sy, sx = np.where(screen)
    s_top, s_bottom, s_left, s_right = sy.min(), sy.max() + 1, sx.min(), sx.max() + 1
    fw, fh = right - left, bottom - top

    # 화면 모서리 둥글기: 화면 맨 윗줄에서 뚫린 부분이 시작하는 x 로 잼
    first_row = np.where(screen[s_top])[0]
    radius = first_row.min() - s_left

    img = Image.fromarray(rgba, 'RGBA').crop((left, top, right, bottom))
    scale = OUT_HEIGHT / fh
    img = img.resize((round(fw * scale), OUT_HEIGHT), Image.LANCZOS)
    img.save(dst, 'WEBP', quality=90, method=6)

    pct = lambda v, total: round(v / total * 100, 3)
    print(f'저장: {dst} ({img.width}x{img.height})')
    print('PhoneMockup.jsx 의 FRAME 에 넣을 값:')
    print(f'  ratio: {round(fw / fh, 5)},            // 틀 가로 / 세로')
    print(f'  screen: {{ left: {pct(s_left - left, fw)}, top: {pct(s_top - top, fh)}, '
          f'width: {pct(s_right - s_left, fw)}, height: {pct(s_bottom - s_top, fh)} }},  // 틀 대비 %')
    print(f'  screenRatio: {round((s_right - s_left) / (s_bottom - s_top), 5)},      // 화면 가로 / 세로')
    print(f'  radius: {pct(radius, s_right - s_left)},           // 화면 모서리 둥글기 (화면 가로 대비 %)')


if __name__ == '__main__':
    main()
