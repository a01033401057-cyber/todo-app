// 오늘의 할 일 — 목표 화면 조각 (연간 → 반기 → 월간 → 주간 → 일일)

// 필터가 적용된 목표 목록 (추가한 순서)
function goalsOf(scope, key) {
  const list = itemsOf('goal', scope, key);
  const filtered = state.filter === 'all' ? list : list.filter((goal) => goal.cat === state.filter);
  return [...filtered].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

// '예시' 배지
function exampleBadge(item) {
  return item.example ? h('span', { class: 'badge badge-example', text: '예시' }) : null;
}

// 수치형 진행 글: '12 / 100 km · 12%'
function goalProgressText(goal) {
  const unit = goal.unit ? ` ${goal.unit}` : '';
  return `${(Number(goal.current) || 0).toLocaleString('ko-KR')} / ${Number(goal.target).toLocaleString('ko-KR')}${unit} · ${goalPercent(goal)}%`;
}

// 목표 한 개
function goalRow(goal) {
  const numeric = isNumericGoal(goal);
  const titleButton = h('button', { type: 'button', class: 'goal-title', 'aria-label': `목표 수정: ${goal.title}`, data: actData('edit', { id: goal.id }) }, goal.title);
  return h('li', { class: `goal${goal.done ? ' is-done' : ''}` },
    h('div', { class: 'goal-top' },
      !numeric && h('input', { type: 'checkbox', class: 'goal-check', checked: Boolean(goal.done), 'aria-label': `완료: ${goal.title}`, data: actData('toggle', { id: goal.id }) }),
      titleButton,
      tagNode(goal.cat)),
    numeric && bar(goalRatio(goal), 'goal-bar'),
    numeric && h('div', { class: 'goal-meta' },
      h('span', { class: 'goal-progress', text: goalProgressText(goal) }),
      h('span', { class: 'stepper' },
        h('button', { type: 'button', class: 'step-btn', 'aria-label': `하나 줄이기: ${goal.title}`, text: '−', data: actData('dec', { id: goal.id }) }),
        h('button', { type: 'button', class: 'step-btn', 'aria-label': `하나 늘리기: ${goal.title}`, text: '+', data: actData('inc', { id: goal.id }) }))),
    (goal.memo || goal.example) && h('div', { class: 'goal-meta' }, h('span', { class: 'meta-memo', text: goal.memo }), exampleBadge(goal)));
}

// 목표 패널. pick = 편집 창 기간 선택 값(year/half1/half2/month/week/day), dateText = 그 기간 안의 날짜
function goalsPanel(title, scope, key, pick, dateText, extra) {
  const goals = goalsOf(scope, key);
  return panel(title,
    h('button', { type: 'button', class: 'link-btn add-link', text: '+ 목표', data: actData('new-goal', { pick, date: dateText }) }),
    goals.length ? h('ul', { class: 'goal-list' }, goals.map(goalRow)) : emptyNote('아직 목표가 없어요.'),
    extra);
}

// 상위 목표 요약: [[라벨, scope, key], ...]
function parentGoals(levels) {
  const rows = levels.flatMap(([label, scope, key]) => goalsOf(scope, key).map((goal) => h('li', { class: 'parent-row' },
    h('b', { text: label }),
    h('span', { class: goal.done ? 'is-done' : '' },
      goal.title,
      isNumericGoal(goal) && h('span', { class: 'parent-num', text: ` (${(Number(goal.current) || 0).toLocaleString('ko-KR')}/${Number(goal.target).toLocaleString('ko-KR')})` })))));
  return rows.length ? h('ul', { class: 'parent-goals', 'aria-label': '상위 목표' }, rows) : null;
}

// 날짜 하나 기준 상위 목표 단계들
function levelsAbove(scope, dateText) {
  const all = [
    ['주간', 'week', keyFor('week', dateText)],
    ['월간', 'month', keyFor('month', dateText)],
    ['반기', 'half', keyFor('half', dateText)],
    ['연간', 'year', keyFor('year', dateText)],
  ];
  const order = ['day', 'week', 'month', 'half', 'year'];
  return all.filter(([, levelScope]) => order.indexOf(levelScope) > order.indexOf(scope));
}

// 예시 안내 띠
function exampleBanner() {
  const count = store.items.filter((item) => item.example).length;
  if (!count) return null;
  return h('div', { class: 'banner', role: 'note' },
    h('span', {}, '‘예시’ 배지가 붙은 목표 ', h('b', { text: `${count}개` }), '는 사용법을 보여 주는 샘플이에요. 직접 목표를 넣은 뒤 지워 주세요.'),
    h('button', { type: 'button', class: 'link-btn', text: '예시 모두 지우기', data: actData('clear-examples') }));
}
