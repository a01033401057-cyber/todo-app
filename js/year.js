// 오늘의 할 일 — 연간 화면

// 올해가 몇 % 지났는지 (다른 해면 null)
function yearElapsedPercent(year) {
  const now = new Date();
  if (now.getFullYear() !== year) return null;
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return Math.round(((now - start) / (end - start)) * 100);
}

function renderYear() {
  const year = parseDate(state.date).getFullYear();
  const elapsed = yearElapsedPercent(year);
  setPeriod(`${year}년`, elapsed === null ? '연간 보기' : `올해 ${elapsed}% 지남`);
  const plans = store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && String(item.key).startsWith(`${year}-`)
    && (state.filter === 'all' || item.cat === state.filter));
  return {
    side: [
      goalsPanel('연간 목표', 'year', String(year), 'year', `${year}-01-01`),
      goalsPanel('상반기 목표 · 1–6월', 'half', `${year}-H1`, 'half1', `${year}-01-01`),
      goalsPanel('하반기 목표 · 7–12월', 'half', `${year}-H2`, 'half2', `${year}-07-01`),
    ],
    main: [h('section', { class: 'panel', 'aria-label': '올해 진행률' }, progressSummary(plans))],
  };
}
