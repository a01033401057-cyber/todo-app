// 오늘의 할 일 — 선 아이콘 (외부 파일 없이 SVG로 직접 그린다, 24×24 격자, 선 굵기 2)
// 문자열은 path의 d 값, { c: [x, y, r] }는 원, { fill: d }는 채운 도형

const ICONS = {
  // 화면 공통
  calendar: ['M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 2v4', 'M16 2v4', 'M3 10h18'],
  'calendar-check': ['M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 2v4', 'M16 2v4', 'M3 10h18', 'M9 15.5l2 2 4-4'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  sliders: ['M4 6h10', 'M20 6h-2', 'M4 12h4', 'M20 12h-8', 'M4 18h12', { c: [16, 6, 2] }, { c: [10, 12, 2] }, { c: [18, 18, 2] }],
  compass: [{ c: [12, 12, 9] }, 'M15.5 8.5l-2 5-5 2 2-5z'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
  'star-fill': [{ fill: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' }],
  play: [{ fill: 'M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z' }],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  target: [{ c: [12, 12, 9] }, { c: [12, 12, 5] }, { c: [12, 12, 1] }],
  sunrise: ['M12 3v4', 'M5.2 8.2l1.6 1.6', 'M18.8 8.2l-1.6 1.6', 'M3 17h2', 'M19 17h2', 'M7 17a5 5 0 0 1 10 0', 'M3 21h18'],
  sun: [{ c: [12, 12, 4] }, 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  zap: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', { c: [4.5, 6, 1] }, { c: [4.5, 12, 1] }, { c: [4.5, 18, 1] }],
  message: ['M21 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z'],
  flag: ['M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'],
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  chart: ['M4 20h16', 'M7 16v-4', 'M12 16V7', 'M17 16v-7'],
  clipboard: ['M9 3h6v4H9z', 'M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2', 'M9 13l2 2 4-4'],
  clock: [{ c: [12, 12, 9] }, 'M12 7v5l3 2'],
  flame: ['M12 3c.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.8 2.5-5.5.4 1.3 1.2 2 2 2.2-.6-2.4-.2-4.6.5-6.7z'],
  download: ['M12 4v11', 'M7 10.5l5 4.5 5-4.5', 'M5 20h14'],
  upload: ['M12 15V4', 'M7 8.5L12 4l5 4.5', 'M5 20h14'],
  sparkles: ['M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z', 'M19 15l.7 1.6 1.6.7-1.6.7L19 19.6l-.7-1.6-1.6-.7 1.6-.7z'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  pin: ['M12 16v5', 'M8 3h8', 'M9 3v5l-3 4h12l-3-4V3'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  layers: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8 21h8', 'M10 17h4v4h-4z'],

  // 카테고리 8개
  toeic: ['M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z', 'M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z'],
  workout: ['M6.5 7v10', 'M17.5 7v10', 'M3.5 9.5v5', 'M20.5 9.5v5', 'M6.5 12h11'],
  blog: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z', 'M13.5 6.5l4 4'],
  stock: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  reading: ['M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z', 'M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3', 'M9 7h6'],
  speaking: ['M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z', 'M18.5 11a6.5 6.5 0 0 1-13 0', 'M12 17.5V21'],
  rest: ['M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z', 'M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16', 'M8 3.5v2', 'M12 3.5v2'],
  etc: ['M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8.5 8.5-9 9z', { c: [8, 8, 1.5] }],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// 아이콘 요소 만들기. 장식용이라 화면 읽기 프로그램에는 숨긴다 (옆에 글자가 있거나 aria-label이 있는 버튼 안에 쓴다)
function icon(name, size = 18, className = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    class: `icon${className ? ` ${className}` : ''}`,
  };
  Object.entries(attrs).forEach(([key, value]) => svg.setAttribute(key, String(value)));
  (ICONS[name] ?? ICONS.etc).forEach((part) => {
    let shape;
    if (typeof part === 'string') {
      shape = document.createElementNS(SVG_NS, 'path');
      shape.setAttribute('d', part);
    } else if (part.c) {
      shape = document.createElementNS(SVG_NS, 'circle');
      const [cx, cy, r] = part.c;
      shape.setAttribute('cx', cx);
      shape.setAttribute('cy', cy);
      shape.setAttribute('r', r);
    } else {
      shape = document.createElementNS(SVG_NS, 'path');
      shape.setAttribute('d', part.fill);
      shape.setAttribute('fill', 'currentColor');
      shape.setAttribute('stroke', 'none');
    }
    svg.append(shape);
  });
  return svg;
}

// 카테고리 아이콘 (저장 값 = 아이콘 이름)
function catIcon(catId, size = 14) {
  return icon(CATEGORY_MAP[catId] ? catId : 'etc', size, 'cat-icon');
}

// index.html에 미리 적어 둔 <span data-icon="이름">에 아이콘을 채운다 (앱 시작 때 한 번)
function applyStaticIcons() {
  document.querySelectorAll('[data-icon]').forEach((element) => {
    element.replaceChildren(icon(element.dataset.icon, Number(element.dataset.size) || 18));
  });
}
