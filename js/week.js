// 오늘의 할 일 — 주간 화면

// 주간 설계 체크리스트 (일요일 10분)
const WEEK_DESIGN_STEPS = [
  ['review', '지난주 피드백 읽기', '지난주에 적은 ‘바꿀 점’과 회고를 먼저 읽어요.'],
  ['goals', '이번 주 목표 정하기', '‘러닝’ 대신 ‘러닝 3회 · 총 15km’처럼 결과물로 적어요.'],
  ['fixed', '고정 일정 먼저 넣기', '수업·알바·약속처럼 옮길 수 없는 일을 먼저 넣고 ‘고정’으로 표시해요.'],
  ['thumbs', '썸네일 후보 정하기', '요일마다 “이것만 하면 성공”인 일 하나를 ★로 정해 두세요.'],
  ['cap', '계획량 70–80% 맞추기', '아래 막대가 초록 구간에 들어오게 계획량을 맞춰요.'],
];

// 그 주 7일 (월요일부터)
function weekDays(mondayText) {
  return Array.from({ length: 7 }, (_, index) => addDays(mondayText, index));
}

// 그 주의 일일 할 일 전체 (필터 미적용)
function weekDayPlansAll(mondayText) {
  return weekDays(mondayText).flatMap(dayPlans);
}

// 계획 시간 합계 (고정 일정은 가용 시간 밖이므로 뺀다)
function plannedMinutes(list) {
  return list.filter((item) => !item.fixed).reduce((sum, item) => sum + (Number(item.dur) || 0), 0);
}

// 이번 주 가용 시간 (이 주만 따로 정했으면 그 값)
function weekHours(mondayText) {
  return Number(getWeek(mondayText).hours) || store.settings.weekHours;
}

// ----- 계획량 막대 -----
function capacityBlock(mondayText) {
  const hours = weekHours(mondayText);
  const flexible = [...weekDayPlansAll(mondayText), ...itemsOf('plan', 'week', mondayText)].filter((item) => !item.fixed);
  const minutes = plannedMinutes(flexible);
  const noDuration = flexible.filter((item) => !Number(item.dur)).length;
  const percent = Math.round((minutes / (hours * 60)) * 100);
  const [stateClass, stateLabel] = percent > 80 ? ['over', '과부하'] : percent >= 70 ? ['ok', '적정'] : ['low', '여유'];
  return h('div', { class: 'capacity' },
    h('div', { class: `cap-bar is-${stateClass}`, role: 'img', 'aria-label': `가용 시간의 ${percent}% 계획됨 (${stateLabel})` },
      h('span', { class: 'cap-band' }),
      h('span', { class: 'cap-fill', width: Math.min(percent, 100) })),
    h('div', { class: 'cap-legend' },
      h('span', {}, '계획 ', h('b', { text: `${formatHours(minutes)}시간` }), ' / 가용 ',
        h('label', { class: 'inline-input' },
          h('span', { class: 'visually-hidden', text: '이번 주 가용 시간' }),
          h('input', { type: 'number', id: 'wk-hours', min: '1', max: '120', inputmode: 'numeric', value: String(hours), data: { wk: mondayText } })),
        '시간'),
      h('span', { class: `cap-state is-${stateClass}`, text: `${percent}% · ${stateLabel}` })),
    hint(`초록 구간(70–80%)까지만 채우고 나머지는 비워 두세요. 예상 못 한 일이 꼭 생겨요.${noDuration ? ` 소요 시간이 없는 계획 ${noDuration}개는 빠져 있어요.` : ''}`));
}

// ----- 지난주 기록 -----
function lastWeekNotes(mondayText) {
  const prevMonday = addDays(mondayText, -7);
  const changes = weekDays(prevMonday).map((dateText) => ({ dateText, text: getDay(dateText).change })).filter((note) => note.text);
  const reflect = getWeek(prevMonday).reflect;
  return { changes, reflect };
}

// 주간 설계 패널
function weekDesignPanel(mondayText) {
  const checks = getWeek(mondayText).checks ?? {};
  const { changes, reflect } = lastWeekNotes(mondayText);
  const extras = {
    review: (changes.length || reflect)
      ? h('ul', { class: 'note-list' },
        changes.map((note) => h('li', {}, h('b', { text: shortDay(note.dateText) }), h('span', { text: note.text }))),
        reflect && h('li', {}, h('b', { text: '회고' }), h('span', { text: reflect })))
      : h('p', { class: 'hint', text: '지난주에 적은 피드백이 없어요.' }),
    cap: capacityBlock(mondayText),
  };
  return panel('주간 설계 · 일요일 10분', null,
    h('ol', { class: 'design-steps' }, WEEK_DESIGN_STEPS.map(([key, title, desc], index) => {
      const on = Boolean(checks[key]);
      return h('li', { class: `design-step${on ? ' is-done' : ''}` },
        h('input', { type: 'checkbox', id: `wk-step-${key}`, checked: on, data: actData('wcheck', { k: key, wk: mondayText }) }),
        h('div', { class: 'design-body' },
          h('span', { class: 'step-no', text: `STEP ${index + 1}` }),
          h('label', { class: 'design-title', htmlFor: `wk-step-${key}`, text: title }),
          h('span', { class: 'hint', text: desc }),
          extras[key]));
    })));
}

// '월 6'
function shortDay(dateText) {
  const date = parseDate(dateText);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

// ----- 7일 카드 -----
function dayCard(dateText) {
  const date = parseDate(dateText);
  const plans = sortPlans(visibleDayPlans(dateText));
  const minutes = plannedMinutes(dayPlans(dateText));
  const thumb = getDay(dateText).thumb;
  const weekday = date.getDay();
  const classes = ['day-card'];
  if (dateText === todayString()) classes.push('is-today');
  if (weekday === 0) classes.push('is-sun');
  if (weekday === 6) classes.push('is-sat');
  return h('li', { class: classes.join(' ') },
    h('button', { type: 'button', class: 'day-card-head', 'aria-label': `${dayLabel(dateText)} 일일 화면으로`, data: actData('goto-day', { date: dateText }) },
      h('b', { text: WEEKDAYS[weekday] }), h('span', { class: 'day-num', text: String(date.getDate()) })),
    minutes > 0 && h('span', { class: 'day-load', text: `${formatHours(minutes)}시간 계획` }),
    h('ul', { class: 'mini-list' }, plans.map((item) => h('li', { class: `mini-item${item.done ? ' is-done' : ''}${item.fixed ? ' is-fixed' : ''}`, cat: item.cat },
      h('input', { type: 'checkbox', checked: Boolean(item.done), 'aria-label': `완료: ${item.title}`, data: actData('toggle', { id: item.id }) }),
      h('button', { type: 'button', class: 'mini-title', 'aria-label': `수정: ${item.title}`, data: actData('edit', { id: item.id }) },
        thumb === item.id && h('span', { class: 'mini-star', text: '★ ' }),
        item.time && h('span', { class: 'mini-time', text: `${item.time} ` }),
        item.title)))),
    h('button', { type: 'button', class: 'day-card-add', text: '+ 추가', 'aria-label': `${dayLabel(dateText)}에 할 일 추가`, data: actData('new-plan', { pick: 'day', date: dateText }) }));
}

// ----- 주간 계획 (요일 없는 할 일) -----
function weekPlansPanel(mondayText) {
  const list = sortPlans(itemsOf('plan', 'week', mondayText).filter((item) => state.filter === 'all' || item.cat === state.filter));
  return panel('주간 계획',
    h('button', { type: 'button', class: 'link-btn add-link', text: '+ 계획', data: actData('new-plan', { pick: 'week', date: mondayText }) }),
    list.length
      ? h('ul', { class: 'todo-list' }, list.map((item) => planRow(item)))
      : emptyNote('요일을 정하지 않은 이번 주 할 일을 결과물로 적어 두세요.'));
}

// ----- 주간 회고 -----
function weekReviewPanel(mondayText) {
  const notes = weekDays(mondayText).map((dateText) => ({ dateText, ...getDay(dateText) })).filter((day) => day.good || day.change);
  return panel('이번 주 피드백', null,
    notes.length
      ? h('ul', { class: 'note-list' }, notes.map((day) => h('li', {},
        h('b', { text: shortDay(day.dateText) }),
        h('div', {},
          day.good && h('p', {}, h('span', { class: 'note-tag', text: '잘됨' }), day.good),
          day.change && h('p', {}, h('span', { class: 'note-tag', text: '바꿀 점' }), day.change)))))
      : emptyNote('일일 화면 아래 ‘하루 피드백’에 적은 내용이 여기에 모여요.'),
    h('div', { class: 'field' },
      h('label', { htmlFor: 'wk-reflect', text: '다음 주에 바꿀 한 가지' }),
      h('textarea', { id: 'wk-reflect', rows: '2', maxlength: '300', placeholder: '예: 평일 저녁 운동이 자꾸 밀림 → 아침 러닝으로 옮겨 보기', data: { wk: mondayText } }, getWeek(mondayText).reflect)));
}

// ----- 카테고리 집계 -----
function tallyPanel(title, list) {
  const rows = CATEGORIES.map((cat) => {
    const mine = list.filter((item) => item.cat === cat.id);
    return { cat, total: mine.length, done: mine.filter((item) => item.done).length };
  }).filter((row) => row.total > 0);
  const max = Math.max(1, ...rows.map((row) => row.total));
  return panel(title, null,
    rows.length
      ? h('ul', { class: 'tally' }, rows.map((row) => h('li', { class: 'tally-row', cat: row.cat.id },
        h('span', { text: row.cat.label }),
        h('div', { class: 'bar tally-bar', title: `${row.done}/${row.total}` }, h('span', { class: 'bar-fill', width: (row.done / max) * 100 })),
        h('span', { class: 'tally-num', text: `${row.done}/${row.total}` }))))
      : emptyNote('기록된 할 일이 없어요.'));
}

function renderWeek() {
  const monday = mondayOf(state.date);
  setPeriod(weekLabel(monday), weekRange(monday));
  const days = weekDays(monday);
  const visible = days.flatMap(visibleDayPlans);
  const focusTotal = days.reduce((sum, dateText) => sum + (Number(getDay(dateText).focusMin) || 0), 0);
  const lastReflect = getWeek(addDays(monday, -7)).reflect;
  return {
    side: [
      goalsPanel('주간 목표', 'week', monday, 'week', monday, parentGoals(levelsAbove('week', monday))),
      tallyPanel('이번 주 카테고리', days.flatMap(dayPlans)),
    ],
    main: [
      lastReflect && h('div', { class: 'callout', role: 'note' }, h('b', { text: '지난주에 정한 한 가지' }), h('span', { text: lastReflect })),
      weekDesignPanel(monday),
      h('section', { class: 'panel', 'aria-label': '이번 주 진행률' },
        progressSummary(visible),
        h('div', { class: 'stat-row' }, h('span', {}, '이번 주 몰입 ', h('b', { text: String(focusTotal) }), '분'))),
      h('ul', { class: 'week-grid', 'aria-label': '이번 주 7일' }, days.map(dayCard)),
      weekPlansPanel(monday),
      weekReviewPanel(monday),
    ],
  };
}
