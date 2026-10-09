// 오늘의 할 일 — 연간 화면

// 올해가 몇 % 지났는지 (다른 해면 null)
function yearElapsedPercent(year) {
  const now = new Date();
  if (now.getFullYear() !== year) return null;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return Math.round(((now - start) / (end - start)) * 100);
}

// 연간 계획: 목표 월별로 묶어서 (연중 미지정은 맨 뒤)
function yearPlansPanel(year) {
  const plans = itemsOf('plan', 'year', String(year)).filter((item) => state.filter === 'all' || item.cat === state.filter);
  const now = new Date();
  const defaultMonth = now.getFullYear() === year ? now.getMonth() + 1 : 1;
  const groups = [...Array.from({ length: 12 }, (_, index) => index + 1), 0].map((month) => ({
    month,
    list: sortPlans(plans.filter((item) => (Number(item.month) || 0) === month)),
  })).filter((group) => group.list.length);
  return panel('연간 계획',
    h('button', { type: 'button', class: 'link-btn add-link', text: '+ 계획', data: actData('new-plan', { pick: 'year', date: `${year}-${pad(defaultMonth)}-01` }) }),
    groups.length
      ? h('div', { class: 'year-plan-groups' }, groups.map((group) => h('section', { class: 'year-plan-group', 'aria-label': group.month ? `${group.month}월` : '연중 (미지정)' },
        h('h3', { class: 'group-title', text: group.month ? `${group.month}월` : '연중 (미지정)' }),
        h('ul', { class: 'todo-list' }, group.list.map((item) => planRow(item))))))
      : emptyNote('목표 월(1–12월)을 정해서 올해 할 큰 계획을 적어 두세요. 월간 화면에도 보여요.'));
}

// 12개월 미니 카드
function monthCard(year, month) {
  const monthKey = `${year}-${pad(month)}`;
  const plans = monthDayPlans(monthKey);
  const { done, total, percent } = getProgress(plans);
  const goals = itemsOf('goal', 'month', monthKey);
  const goalsDone = goals.filter((goal) => goal.done).length;
  const now = new Date();
  const isNow = now.getFullYear() === year && now.getMonth() + 1 === month;
  return h('li', {},
    h('button', {
      type: 'button',
      class: `month-card${isNow ? ' is-now' : ''}`,
      'aria-label': `${month}월: 할 일 ${total}개 중 ${done}개 완료, 월간 목표 ${goals.length}개 중 ${goalsDone}개 달성. 월간 화면으로`,
      data: actData('goto-month', { date: `${monthKey}-01` }),
    },
    h('span', { class: 'month-name', text: `${month}월` }),
    bar(percent, 'month-bar'),
    h('span', { class: 'month-stat' }, '완료 ', h('b', { text: String(done) }), `/${total}`),
    h('span', { class: 'month-stat' }, '목표 ', h('b', { text: String(goalsDone) }), `/${goals.length} 달성`)));
}

function renderYear() {
  const year = parseDate(state.date).getFullYear();
  const elapsed = yearElapsedPercent(year);
  setPeriod(`${year}년`, elapsed === null ? '연간 보기' : `올해 ${elapsed}% 지남`);
  const yearDayPlans = store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && String(item.key).startsWith(`${year}-`));
  return {
    side: [
      goalsPanel('연간 목표', 'year', String(year), 'year', `${year}-01-01`),
      goalsPanel('상반기 목표 · 1–6월', 'half', `${year}-H1`, 'half1', `${year}-01-01`),
      goalsPanel('하반기 목표 · 7–12월', 'half', `${year}-H2`, 'half2', `${year}-07-01`),
    ],
    main: [
      yearPlansPanel(year),
      panel('12개월', null,
        h('ul', { class: 'month-grid' }, Array.from({ length: 12 }, (_, index) => monthCard(year, index + 1))),
        hint('월을 누르면 월간 화면으로 가요. 완료는 그 달 일일 할 일 기준이에요.')),
      tallyPanel(`${year}년 카테고리`, yearDayPlans),
    ],
  };
}
