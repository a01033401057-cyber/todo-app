"""앱 아이콘 생성 스크립트 (Python 표준 라이브러리 zlib, struct만 사용)

단색 배경에 흰색 체크 표시를 그린 PNG를 만든다.
실행: python tools/make_icons.py  (프로젝트 루트에서)
"""

import math
import os
import struct
import zlib

# 배경색 (앱의 주 색상 #4F46E5)
BG = (0x4F, 0x46, 0xE5)
FG = (0xFF, 0xFF, 0xFF)

# 체크 표시 꺾은선 좌표 (아이콘 크기 대비 비율) — maskable 안전 영역(가운데 80%) 안에 둔다
CHECK_POINTS = [(0.30, 0.52), (0.44, 0.66), (0.71, 0.37)]
STROKE_RATIO = 0.085  # 선 두께 (아이콘 크기 대비)

# 출력할 파일 이름과 크기
ICONS = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "apple-touch-icon.png": 180,
}


def segment_distance(px, py, ax, ay, bx, by):
    """점 P와 선분 AB 사이의 거리를 구한다."""
    dx, dy = bx - ax, by - ay
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def draw_icon(size):
    """아이콘 픽셀을 RGB 바이트 행 목록으로 만든다 (가장자리 안티에일리어싱)."""
    points = [(x * size, y * size) for x, y in CHECK_POINTS]
    half = STROKE_RATIO * size / 2
    rows = []
    for y in range(size):
        row = bytearray([0])  # PNG 필터 타입 0 (None)
        for x in range(size):
            cx, cy = x + 0.5, y + 0.5
            d = min(
                segment_distance(cx, cy, *points[i], *points[i + 1])
                for i in range(len(points) - 1)
            )
            alpha = max(0.0, min(1.0, half - d + 0.5))
            row.extend(round(b + (f - b) * alpha) for b, f in zip(BG, FG))
        rows.append(bytes(row))
    return b"".join(rows)


def png_chunk(kind, data):
    """PNG 청크 하나를 만든다 (길이 + 종류 + 데이터 + CRC)."""
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path, size):
    """size x size RGB PNG 파일을 저장한다."""
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8비트 RGB
    data = zlib.compress(draw_icon(size), 9)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(png_chunk(b"IHDR", header))
        f.write(png_chunk(b"IDAT", data))
        f.write(png_chunk(b"IEND", b""))


def main():
    """icons/ 폴더에 모든 아이콘을 만든다."""
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for name, size in ICONS.items():
        path = os.path.join(out_dir, name)
        write_png(path, size)
        print(f"생성: icons/{name} ({size}x{size})")


if __name__ == "__main__":
    main()
