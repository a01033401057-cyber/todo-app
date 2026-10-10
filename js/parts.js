// 오늘의 할 일 — 여러 화면에서 함께 쓰는 화면 조각

// data-act 버튼용 data 묶음. fk는 다시 그린 뒤 포커스를 되찾을 때 쓰는 키
function actData(act, extra = {}) {
  return { act, ...extra, fk: [act, ...Object.values(extra)].join(':') };
}

// 카테고리 태그 (아이콘 + 이름)
function tagNode(catId) {
  return h('span', { class: 'tag', cat: catId }, catIcon(catId, 12), (CATEGORY_MAP[catId] ?? CATEGORY_MAP.etc).label);
}

// 패널 제목 → 아이콘 (제목에 들어 있는 낱말로 고른다)
const PANEL_ICONS = [
  [/목표/, 'target'], [/루틴/, 'sunrise'], [/골든/, 'sun'], [/빠른 추가/, 'zap'], [/일일 계획/, 'list'],
  [/피드백/, 'message'], [/설계/, 'compass'], [/주간 계획/, 'clipboard'], [/연간 계획/, 'flag'],
  [/카테고리/, 'chart'], [/12개월/, 'grid'],
];

// 패널: 아이콘 + 제목 + 오른쪽 도구 + 본문
function panel(title, tools, ...body) {
  const found = PANEL_ICONS.find(([pattern]) => pattern.test(title));
  return h('section', { class: 'panel' },
    h('div', { class: 'panel-head' },
      h('h2', { class: 'panel-title' }, found && h('span', { class: 'panel-icon' }, icon(found[1], 16)), title),
      tools),
    body);
}

// '+ 목표' 같은 작은 추가 버튼
function addLink(label, data) {
  return h('button', { type: 'button', class: 'link-btn add-link', data }, icon('plus', 16), label);
}

// 작은 안내 문구
function hint(text) {
  return h('p', { class: 'hint', text });
}

// 진행 막대
function bar(percent, className = '') {
  return h('div', { class: `bar ${className}` }, h('span', { class: 'bar-fill', width: percent }));
}

// 할 일 보조 줄: 카테고리 태그, 세부 항목, 소요 시간, 고정 배지, 골든 타임 배지, 메모
function metaLine(item, golden) {
  return h('div', { class: 'todo-meta' },
    tagNode(item.cat),
    item.sub && h('span', { text: item.sub }),
    item.dur && h('span', { class: 'meta-dur' }, icon('clock', 12), formatDuration(item.dur)),
    item.fixed && h('span', { class: 'badge badge-fixed' }, icon('pin', 11), '고정'),
    golden && h('span', { class: 'badge badge-golden' }, icon('sun', 11), '골든 타임'),
    item.memo && h('span', { class: 'meta-memo', text: item.memo }));
}

// 할 일 한 줄. opts: { golden: 골든 타임 강조, thumbId: 오늘의 썸네일 id, actions: ☆ 버튼 표시 }
function planRow(item, opts = {}) {
  const golden = Boolean(opts.golden) && isGolden(item);
  const isThumb = opts.thumbId === item.id;
  return h('li', { class: `todo-item${item.done ? ' is-completed' : ''}${golden ? ' is-golden' : ''}`, data: { id: item.id } },
    h('label', { class: 'check-area' },
      h('input', { type: 'checkbox', class: 'todo-check', checked: Boolean(item.done), 'aria-label': `완료: ${item.title}`, data: actData('toggle', { id: item.id }) })),
    h('div', { class: 'todo-body' },
      h('button', { type: 'button', class: 'todo-title', 'aria-label': `수정: ${item.title}`, data: actData('edit', { id: item.id }) },
        item.time && h('span', { class: 'todo-time', text: item.time }),
        h('span', { class: 'todo-text', text: item.title })),
      metaLine(item, golden)),
    opts.actions && h('div', { class: 'todo-actions' },
      h('button', {
        type: 'button',
        class: `icon-btn${isThumb ? ' is-on' : ''}`,
        'aria-pressed': String(isThumb),
        'aria-label': `오늘의 썸네일로 정하기: ${item.title}`,
        title: '오늘의 썸네일로 정하기',
        data: actData('thumb', { id: item.id }),
      }, icon(isThumb ? 'star-fill' : 'star', 18)),
      !item.done && h('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': `영화관 모드로 집중하기: ${item.title}`,
        title: '영화관 모드로 집중하기',
        data: actData('focus', { id: item.id }),
      }, icon('play', 16))));
}

// 전체 진행률 줄: 'N / M 완료' + 막대 + %
function progressSummary(list, label = '완료') {
  const { done, total, percent } = getProgress(list);
  return h('div', { class: 'summary' },
    h('span', { class: 'summary-count' }, String(done), h('small', { text: ` / ${total} ${label}` })),
    h('div', { class: 'bar summary-bar', role: 'progressbar', 'aria-label': '진행률', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(percent) },
      h('span', { class: 'bar-fill', width: percent })),
    h('span', { class: 'summary-percent', text: `${percent}%` }));
}

// 카테고리별 미니 진행률 8개
function miniProgress(list) {
  return h('ul', { class: 'mini-progress' }, CATEGORIES.map((cat) => {
    const progress = getProgress(list.filter((item) => item.cat === cat.id));
    return h('li', { class: `mini${progress.total === 0 ? ' is-empty' : ''}`, cat: cat.id },
      h('span', { class: 'mini-label' }, catIcon(cat.id, 12), cat.label),
      bar(progress.percent, 'mini-bar'),
      h('span', { class: 'mini-text', text: `${progress.done}/${progress.total}` }));
  }));
}

// 빈 상태 안내
function emptyNote(text) {
  return h('p', { class: 'empty' }, icon('sparkles', 18, 'empty-icon'), h('span', { text }));
}
