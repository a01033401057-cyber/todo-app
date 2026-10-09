// 오늘의 할 일 — 월간 화면 (달력)

// 그 달 일일 할 일 (필터 적용)
function monthDayPlans(monthKey) {
  return store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && String(item.key).startsWith(`${monthKey}-`)
    && (state.filter === 'all' || item.cat === state.filter));
}

// 그 달의 연간 계획 (목표 월이 이 달인 것)
function yearPlansForMonth(year, month) {
  return itemsOf('plan', 'year', String(year)).filter((item) => Number(item.month) === month
    && (state.filter === 'all' || item.cat === state.filter));
}

// 완료율 단계 (칸 배경을 진하게): 0 없음, 1 ~33%, 2 ~66%, 3 그 이상
function rateLevel(list) {
  if (!list.length) return 0;
  const { percent } = getProgress(list);
  if (percent >= 67) return 3;
  if (percent >= 34) return 2;
  return percent > 0 ? 1 : 0;
}

// 달력 한 칸
function calendarCell(dateText, inMonth) {
  const date = parseDate(dateText);
  const plans = sortPlans(visibleDayPlans(dateText));
  const level = rateLevel(plans);
  const classes = ['cal-cell'];
  if (!inMonth) classes.push('is-out');
  if (dateText === todayString()) classes.push('is-today');
  if (level) classes.push(`rate-${level}`);
  if (date.getDay() === 0) classes.push('is-sun');
  if (date.getDay() === 6) classes.push('is-sat');
  const { done, total } = getProgress(plans);
  return h('button', {
    type: 'button',
    class: classes.join(' '),
    'aria-label': `${dayLabel(dateText)}, 할 일 ${total}개 중 ${done}개 완료`,
    data: actData('goto-day', { date: dateText }),
  },
  h('span', { class: 'cal-date', text: String(date.getDate()) }),
  plans.slice(0, 3).map((item) => h('span', { class: `cal-line${item.done ? ' is-done' : ''}`, cat: item.cat, text: item.title })),
  plans.length > 3 && h('span', { class: 'cal-more', text: `+${plans.length - 3}` }),
  plans.length > 0 && h('span', { class: 'cal-dots', 'aria-hidden': 'true' },
    plans.slice(0, 6).map((item) => h('i', { class: item.done ? 'is-done' : '', cat: item.cat })),
    plans.length > 6 && h('b', { text: `+${plans.length - 6}` })));
}

// 달력 (일요일부터 토요일까지, 이전·다음 달 날짜는 흐리게)
function calendar(monthKey) {
  const first = `${monthKey}-01`;
  const firstDate = parseDate(first);
  const daysInMonth = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0).getDate();
  const start = addDays(first, -firstDate.getDay());
  const weeks = Math.ceil((firstDate.getDay() + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, index) => {
    const dateText = addDays(start, index);
    return calendarCell(dateText, dateText.startsWith(`${monthKey}-`));
  });
  return h('div', { class: 'calendar', role: 'group', 'aria-label': '월간 달력' },
    WEEKDAYS.map((name, index) => h('span', { class: `cal-dow${index === 0 ? ' is-sun' : ''}${index === 6 ? ' is-sat' : ''}`, text: name })),
    cells);
}

function renderMonth() {
  const monthKey = keyFor('month', state.date);
  const first = `${monthKey}-01`;
  const date = parseDate(first);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  setPeriod(`${month}월`, `${year}년 · ${month <= 6 ? '상반기' : '하반기'}`);
  const yearPlans = sortPlans(yearPlansForMonth(year, month));
  return {
    side: [
      goalsPanel('월간 목표', 'month', monthKey, 'month', first, parentGoals(levelsAbove('month', first))),
      tallyPanel('이번 달 카테고리', store.items.filter((item) => item.type === 'plan' && item.scope === 'day' && String(item.key).startsWith(`${monthKey}-`))),
    ],
    main: [
      h('section', { class: 'panel', 'aria-label': '이번 달 진행률' }, progressSummary(monthDayPlans(monthKey))),
      h('div', { class: 'panel calendar-panel' }, calendar(monthKey), hint('날짜를 누르면 그날 일일 화면으로 가요. 완료율이 높은 날일수록 칸이 진해져요.')),
      yearPlans.length > 0 && panel(`연간 계획 중 ${month}월`, null, h('ul', { class: 'todo-list' }, yearPlans.map((item) => planRow(item)))),
    ],
  };
}
