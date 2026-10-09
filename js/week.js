// 오늘의 할 일 — 주간 화면

// 그 주 7일 (월요일부터)
function weekDays(mondayText) {
  return Array.from({ length: 7 }, (_, index) => addDays(mondayText, index));
}

function renderWeek() {
  const monday = mondayOf(state.date);
  setPeriod(weekLabel(monday), weekRange(monday));
  const plans = weekDays(monday).flatMap(visibleDayPlans);
  return {
    side: [goalsPanel('주간 목표', 'week', monday, 'week', monday, parentGoals(levelsAbove('week', monday)))],
    main: [h('section', { class: 'panel', 'aria-label': '이번 주 진행률' }, progressSummary(plans))],
  };
}
