# 오늘의 할 일 — 프로젝트 규칙

- 순수 HTML, CSS, JavaScript(ES6+)만 사용. 외부 라이브러리, 프레임워크, 빌드 도구, CDN 금지
- 파일 구성: index.html, style.css, app.js, manifest.json, sw.js, icons/ 폴더 (아이콘 생성 스크립트는 tools/make_icons.py)
- index.html을 브라우저에서 더블클릭해 바로 실행되어야 함 (서버 불필요). file:// 실행도 계속 오류 없이 동작해야 함 (서비스 워커는 http/https에서만 등록)
- 앱 파일(index.html, style.css, app.js, manifest.json, 아이콘)을 수정할 때마다 sw.js의 CACHE_VERSION 숫자를 1 올릴 것
- 모든 경로는 상대 경로 (GitHub Pages 하위 주소에서도 동작해야 함)
- 하루 10~20개의 할 일을 관리하는 개인용 앱, 카테고리는 업무/개인/공부 3개 고정
- 사용자 입력은 항상 textContent로 출력 (innerHTML에 사용자 입력 금지)
- 코드 주석과 화면 문구는 한국어
