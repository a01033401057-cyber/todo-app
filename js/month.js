// 오늘의 할 일 — 월간 화면

// 그 달 일일 할 일 (필터 적용)
function monthDayPlans(monthKey) {
  return store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && String(item.key).startsWith(`${monthKey}-`)
    && (state.filter === 'all' || item.cat === state.filter));
}

function renderMonth() {
  const monthKey = keyFor('month', state.date);
  const first = `${monthKey}-01`;
  const date = parseDate(first);
  setPeriod(`${date.getMonth() + 1}월`, `${date.getFullYear()}년 · ${date.getMonth() < 6 ? '상반기' : '하반기'}`);
  return {
    side: [goalsPanel('월간 목표', 'month', monthKey, 'month', first, parentGoals(levelsAbove('month', first)))],
    main: [h('section', { class: 'panel', 'aria-label': '이번 달 진행률' }, progressSummary(monthDayPlans(monthKey)))],
  };
}
