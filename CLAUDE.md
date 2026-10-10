# 오늘의 할 일 — 프로젝트 규칙

- 순수 HTML, CSS, JavaScript(ES6+)만 사용. 외부 라이브러리, 프레임워크, 빌드 도구, CDN 금지
- 파일 구성: index.html, style.css, app.js, js/ 폴더(core → icons → parts → editor → settings → cinema → quotes → goals → day → week → month → year 순서로 불러옴), manifest.json, sw.js, icons/ 폴더 (아이콘 생성 스크립트는 tools/make_icons.py)
- app.js가 너무 커지면 js/ 폴더에 파일을 나눠도 됨. 단 ES 모듈(type="module", import)은 file://에서 동작하지 않으므로 금지. 일반 <script src> 태그로 순서대로 불러오고, 새 파일은 sw.js의 APP_FILES에도 추가할 것
- reference/ 폴더는 참고용이며 앱에서 불러오거나 sw.js 캐시에 넣지 말 것
- index.html을 브라우저에서 더블클릭해 바로 실행되어야 함 (서버 불필요). file:// 실행도 계속 오류 없이 동작해야 함 (서비스 워커는 http/https에서만 등록)
- 앱 파일(index.html, style.css, app.js, js/*.js, manifest.json, 아이콘)을 수정할 때마다 sw.js의 CACHE_VERSION 숫자를 1 올릴 것
- 모든 경로는 상대 경로 (GitHub Pages 하위 주소에서도 동작해야 함)
- 연간·반기·월간·주간·일일 목표와 계획을 관리하는 개인용 플래너
- 카테고리는 8개 고정: 토익, 운동, 블로그, 주식 공부, 독서, 영어 회화, 휴식, 기타
- 데이터 구조를 바꿀 때는 기존 저장 데이터를 새 구조로 옮기는 마이그레이션을 함께 만들고, 원본 키는 지우지 말 것
- 사용자 입력은 항상 textContent로 출력 (innerHTML에 사용자 입력 금지)
- 글꼴은 시스템 글꼴만 사용 (외부 폰트 금지)
- 코드 주석과 화면 문구는 한국어
- 아이콘은 js/icons.js의 SVG 선 아이콘만 사용 (24×24, 선 굵기 2, 외부 아이콘 폰트·이미지 금지). 장식 아이콘은 aria-hidden, 아이콘만 있는 버튼은 aria-label 필수
- 블로그 수익화 도구(Desktop/blog-tools) 연동: 플래너는 `#importz=`(raw deflate + base64url JSON)·`#import=` 링크와 '설정 → 블로그 할 일 가져오기' 파일로 할 일을 **추가만** 받는다 (형식 `app: 'daily-todo-import'`, 같은 `importId`는 끝나지 않은 할 일의 날짜·메모만 갱신). 형식을 바꾸면 blog-tools의 `blogtools/planner_link.py`도 같이 바꿀 것
- 다른 앱 안(iframe)에서도 열리므로 가져오기 확인은 confirm() 대신 화면 안 안내 띠로 받는다. 다른 탭에서 저장하면 `storage` 이벤트로 다시 읽는다
