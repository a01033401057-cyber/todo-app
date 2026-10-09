// 오늘의 할 일 — 일일 화면

// 필터가 적용된 그날 할 일
function visibleDayPlans(dateText) {
  const list = dayPlans(dateText);
  return state.filter === 'all' ? list : list.filter((item) => item.cat === state.filter);
}

// 오늘의 썸네일 항목 (지워졌으면 없음)
function thumbItem(dateText) {
  const id = getDay(dateText).thumb;
  const item = id ? findItem(id) : null;
  return item && item.type === 'plan' && item.key === dateText ? item : null;
}

// ----- 사이드 -----

function routinePanel(dateText) {
  const checks = getDay(dateText).routine ?? {};
  const routine = store.settings.routine;
  return panel('아침 루틴', h('button', { type: 'button', class: 'link-btn', text: '편집', data: actData('settings') }),
    hint('의지보다 환경. 쉬운 것부터 시작해서 몸을 움직이게 해요.'),
    routine.length
      ? h('ul', { class: 'checklist' }, routine.map((line, index) => {
        const on = Boolean(checks[index]);
        return h('li', { class: `check-row${on ? ' is-done' : ''}` },
          h('label', { class: 'check-line' },
            h('input', { type: 'checkbox', checked: on, data: actData('routine', { i: String(index), date: dateText }) }),
            h('span', { text: line })));
      }))
      : emptyNote('설정에서 루틴을 추가하세요.'));
}

function goldenPanel() {
  const [start, end] = store.settings.golden;
  return panel('골든 타임', h('button', { type: 'button', class: 'link-btn', text: '변경', data: actData('settings') }),
    h('p', { class: 'golden-range', text: `${start}–${end}` }),
    hint('집중이 가장 잘 되는 시간이에요. 이 시간에 시작하는 할 일은 노란색으로 표시돼요. 오늘의 핵심은 여기에 두세요.'));
}

// ----- 본문 -----

// 오늘의 썸네일 카드
function heroCard(dateText) {
  const item = thumbItem(dateText);
  const eyebrow = h('span', { class: 'hero-eyebrow', text: '오늘의 썸네일 · 가장 중요한 1가지' });
  if (!item) {
    const candidates = sortPlans(dayPlans(dateText)).filter((plan) => !plan.done);
    return h('section', { class: 'hero', 'aria-label': '오늘의 썸네일' },
      eyebrow,
      h('p', { class: 'hero-title is-placeholder', text: '오늘 이것 하나만 하면 성공인 일은?' }),
      candidates.length
        ? h('div', { class: 'hero-row' },
          h('label', { class: 'visually-hidden', htmlFor: 'thumb-pick', text: '오늘의 썸네일 고르기' }),
          h('select', { id: 'thumb-pick', class: 'hero-select', data: { date: dateText } },
            h('option', { value: '', text: '할 일에서 고르기…' }),
            candidates.map((plan) => h('option', { value: plan.id, text: plan.title }))))
        : null,
      h('p', { class: 'hero-meta', text: candidates.length ? '할 일 옆의 ☆을 눌러도 정할 수 있어요.' : '할 일을 추가한 뒤 ☆을 눌러 정해 보세요.' }));
  }

  const info = [(CATEGORY_MAP[item.cat] ?? CATEGORY_MAP.etc).label];
  if (item.time) info.push(`${item.time} 시작`);
  if (item.dur) info.push(formatDuration(item.dur));
  if (item.time && !isGolden(item)) info.push('골든 타임 밖이에요');
  return h('section', { class: 'hero', 'aria-label': '오늘의 썸네일' },
    eyebrow,
    h('p', { class: `hero-title${item.done ? ' is-done' : ''}`, text: item.title }),
    h('p', { class: 'hero-meta', text: info.join(' · ') }),
    h('div', { class: 'hero-row' },
      item.done
        ? h('p', { class: 'hero-success', text: '완료했어요. 오늘은 이미 성공한 하루예요.' })
        : heroActions(item),
      h('button', { type: 'button', class: 'btn btn-ghost', text: '바꾸기', data: actData('thumb-clear', { date: dateText }) })));
}

// 썸네일 카드 버튼
function heroActions(item) {
  return [
    h('button', { type: 'button', class: 'btn btn-accent', text: '영화관 모드로 시작', data: actData('focus', { id: item.id }) }),
    h('button', { type: 'button', class: 'btn btn-ghost', text: '완료', data: actData('toggle', { id: item.id }) }),
  ];
}

// 진행률 패널
function dayProgressPanel(dateText) {
  const plans = dayPlans(dateText);
  const planned = plans.filter((item) => !item.fixed).reduce((sum, item) => sum + (Number(item.dur) || 0), 0);
  const { done, total } = getProgress(plans);
  return h('section', { class: 'panel', 'aria-label': '진행률' },
    progressSummary(plans),
    total > 0 && done === total && h('p', { class: 'celebrate', text: dateText === todayString() ? '오늘 할 일을 모두 끝냈어요!' : '이 날의 할 일을 모두 끝냈어요!' }),
    h('div', { class: 'stat-row' },
      h('span', {}, '계획 ', h('b', { text: formatHours(planned) }), '시간'),
      h('span', {}, '골든 타임 할 일 ', h('b', { text: String(plans.filter(isGolden).length) }), '개'),
      dayStatsExtra(dateText)),
    miniProgress(plans));
}

// 진행률 줄: 그날 몰입 시간
function dayStatsExtra(dateText) {
  const label = dateText === todayString() ? '오늘 몰입 ' : '이날 몰입 ';
  return h('span', {}, label, h('b', { text: String(Number(getDay(dateText).focusMin) || 0) }), '분');
}

// 빠른 추가
function quickAddPanel() {
  return panel('빠른 추가', null,
    h('div', { class: 'quick' }, QUICK_ADDS.map(([cat, , title, minutes], index) => h('button', {
      type: 'button',
      class: 'quick-btn',
      cat,
      'aria-label': `빠른 추가: ${title} ${formatDuration(minutes)}`,
      data: actData('quick', { i: String(index) }),
    }, h('span', { class: 'dot' }), `${title} ${formatDuration(minutes)}`))));
}

// 추가 폼 (입력 중인 값은 state에 보관해서 다시 그려도 사라지지 않게)
function addForm() {
  const select = h('select', { id: 'add-category', class: 'add-category' },
    CATEGORIES.map((cat) => h('option', { value: cat.id, text: cat.label, selected: cat.id === state.addCat })));
  return h('form', { class: 'add-form', id: 'add-form' },
    h('label', { class: 'visually-hidden', htmlFor: 'add-input', text: '할 일 내용' }),
    h('input', { id: 'add-input', class: 'add-input', type: 'text', maxlength: String(MAX_TITLE_LENGTH), placeholder: '할 일을 입력하세요', autocomplete: 'off', value: state.addText }),
    h('label', { class: 'visually-hidden', htmlFor: 'add-category', text: '카테고리' }),
    select,
    h('button', { type: 'button', class: 'btn', id: 'add-detail', text: '자세히' }),
    h('button', { type: 'submit', class: 'btn btn-primary', text: '추가' }));
}

// 정렬 토글
function sortToggle() {
  return h('div', { class: 'seg', role: 'group', 'aria-label': '정렬' },
    [['time', '시간순'], ['group', '비슷한 일 묶기']].map(([value, label]) => h('button', {
      type: 'button', 'aria-pressed': String(store.ui.sort === value), text: label, data: actData('sort', { v: value }),
    })));
}

// 일일 계획 목록 패널
function dayPlanPanel(dateText) {
  const all = dayPlans(dateText);
  const plans = sortPlans(visibleDayPlans(dateText));
  const opts = { golden: true, actions: true, thumbId: getDay(dateText).thumb };
  let list;
  if (!all.length) list = emptyNote(dateText === todayString() ? '빠른 추가나 입력칸으로 오늘 할 일을 넣어 보세요. 쉬는 시간도 ‘휴식’으로 넣어 두세요.' : '이 날의 할 일이 없어요.');
  else if (!plans.length) list = emptyNote('이 카테고리에 할 일이 없어요.');
  else if (store.ui.sort === 'group') {
    list = h('ul', { class: 'todo-list', 'aria-label': '할 일 목록' }, CATEGORIES.map((cat) => {
      const group = plans.filter((item) => item.cat === cat.id);
      if (!group.length) return null;
      const minutes = group.reduce((sum, item) => sum + (Number(item.dur) || 0), 0);
      return [
        h('li', { class: 'group-head' }, tagNode(cat.id), h('span', { text: `${group.length}개${minutes ? ` · ${formatHours(minutes)}시간` : ''} · 한 번에 몰아서` })),
        group.map((item) => planRow(item, opts)),
      ];
    }));
  } else {
    list = h('ul', { class: 'todo-list', 'aria-label': '할 일 목록' }, plans.map((item) => planRow(item, opts)));
  }
  const hasDone = all.some((item) => item.done);
  return panel('일일 계획', sortToggle(),
    addForm(),
    list,
    h('div', { class: 'panel-foot' },
      h('button', { type: 'button', class: 'btn btn-danger', disabled: !hasDone, text: '완료 항목 삭제', data: actData('clear-done', { date: dateText }) })));
}

// 본문 맨 위에 덧붙는 안내 (5단계에서 일요일 안내가 들어간다)
function dayTopNotice() {
  return null;
}

// 일일 화면 그리기
function renderDay() {
  const dateText = state.date;
  setPeriod(dayLabel(dateText), dateText === todayString() ? '오늘' : `${parseDate(dateText).getFullYear()}년`);
  return {
    side: [daySideTop(dateText), routinePanel(dateText), goldenPanel()],
    main: [dayTopNotice(dateText), heroCard(dateText), dayProgressPanel(dateText), quickAddPanel(), dayPlanPanel(dateText), dayBottom(dateText)],
  };
}

// 사이드 맨 위: 오늘의 목표 + 상위 목표(주간·월간·반기·연간)
function daySideTop(dateText) {
  return goalsPanel('오늘의 목표', 'day', dateText, 'day', dateText, parentGoals(levelsAbove('day', dateText)));
}

// 하루 피드백 (입력하면 바로 저장, 다시 그리지 않는다)
function dayBottom(dateText) {
  const day = getDay(dateText);
  const box = (id, label, value, placeholder) => h('div', { class: 'field' },
    h('label', { htmlFor: id, text: label }),
    h('textarea', { id, class: 'feedback-input', rows: '3', maxlength: '300', placeholder, data: { date: dateText } }, value));
  return panel('하루 피드백', null,
    hint('자책 대신 패턴 찾기. 짧게 한 줄이면 충분해요.'),
    h('div', { class: 'feedback' },
      box('fb-good', '잘된 점', day.good, '예: 아침 7시 단어 암기, 알람 끄자마자 바로 시작함'),
      box('fb-change', '내일 바꿀 점', day.change, '예: 블로그는 밤 말고 점심 직후로 옮기기')));
}
