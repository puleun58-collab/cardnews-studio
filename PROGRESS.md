# 카드뉴스 스튜디오 진행 기록

기준 문서: `01-PRD.md`, `02-DEVELOPMENT-SPEC.md`, `04-CODEX-QUALITY-REPRODUCTION.md`

## 설정
- 앱 이름: 카드뉴스 스튜디오
- 계정 표시: @hageon
- 파일 슬러그: my-card-studio
- 색상: #141C33 / #FAF5EA / #F5A83B
- 글꼴: 로컬 Pretendard Variable / KoPubWorld Batang·Dotum

## 마일스톤
- [x] M0 React 18 + TypeScript strict + Vite, 설정·토큰·로컬 글꼴
- [x] M1 프로젝트 홈, 한 장/5장 추천 구성, 열기·이름 변경·복제·확인 후 삭제
- [x] M2 Zustand 상태, localStorage 자동 저장, schema v1, 이전 데이터 정규화·손상 백업
- [x] M3 단일 CardRenderer, 1080×1350 원본, 강조 문법, AutoFit, padding 제외 축척
- [x] M4 manifest·registry 기반 7개 템플릿
- [x] M5 페이지 추가·복제·삭제·dnd-kit 순서 변경, manifest 입력 편집기
- [x] M6 midnight 디자인 6종 조절과 모든 템플릿 공통 떠있는 이미지
- [x] M7 860px 이하 단일 패널, safe-area 하단 탭, 44px 터치 영역
- [x] M8 화면 밖 ExportStage, PNG·ZIP·JSON, 글꼴·이미지·2 frame 준비 대기
- [x] M9 동일 CardRenderer 기반 격자/게시물 피드 미리보기
- [x] M10 접근성, 저장 용량, invalid/future/과다 페이지 JSON, 모바일 오버플로
- [x] M11 빌드·lint·자동 회귀·실제 브라우저·로컬 바로가기 검증

## 검증 증거

| 명령/시나리오 | 화면 크기 | 수행 동작 | 실제 결과 | 결과 파일/픽셀 | 콘솔 error/warn |
|---|---:|---|---|---|---:|
| `npm run build` | - | TypeScript strict 및 Vite production build | 성공, 52 modules | `dist/` 생성 | 0/0 |
| `npm run lint` | - | `src`, `tests` oxlint | 성공, warning 없음 | - | 0/0 |
| `npm run verify:brand` | - | 제거 대상 문자열·파일명 검사 | 통과, 0건 | - | 0/0 |
| `npm run verify:ui` | 1440×900 | 프로젝트 생성, 7개 템플릿 선택·편집, 빈 kicker, 500자, 복제, 새로고침 | 8개 시나리오 통과 | Playwright trace-on-failure 설정 | 0/0 (검사 시 수집) |
| `npm run verify:ui` | 360×800 | 페이지/미리보기/편집 탭 이동, 새로고침, 가로 폭 검사 | 통과, `scrollWidth-clientWidth=0` | - | 0/0 |
| `npm run verify:ui` | 390×844 | 페이지/미리보기/편집 탭 이동, 새로고침, 가로 폭 검사 | 통과, `scrollWidth-clientWidth=0` | - | 0/0 |
| `npm run verify:ui` | 768×1024 | 단일 패널 탭, 새로고침, 가로 폭 검사 | 통과, `scrollWidth-clientWidth=0` | - | 0/0 |
| `npm run verify:ui` | 7개 템플릿 | overlay 업로드, width/x/y 끝점, 포인터 드래그, 삭제 | 7종 모두 통과 | data URL 유지 | 0/0 |
| `npm run verify:ui` | - | invalid JSON, schemaVersion 99, 101페이지 거부, design 없는 v1 복구, quota 오류 | 전부 통과 | 기본 디자인 `#141C33` 복구 | 0/0 |
| `npm run verify:exports` | 1080×1350 | 로컬 KoPub 로딩, overlay x/y=100, PNG, 2페이지 ZIP | 통과 | `my-card-studio-나의-카드뉴스-001.png` 1080×1350, ZIP 001→002 | 0/0 |
| Chromium 실제 검사 | 1440×900 | 홈→프로젝트 생성→편집 화면, 로컬 폰트 준비, 새로고침 | 3열 UI·카드 표시 정상, 가로 오버플로 0 | KoPub/Pretendard `document.fonts.check=true` | 0/0 |
| Chromium 실제 검사 | 390×844 | 저장 데이터 복구, 미리보기 탭 확인 | 카드 전체·상단 도구·하단 탭 표시, `scrollWidth=390` | 화면 캡처 확인 | 0/0 |
| `install-local-shortcut.ps1 -Silent` + HTTP 검사 | Windows | 바로가기 설치, `npm run local`, 응답 검사 | 성공 | `C:\Users\tykim\Desktop\카드뉴스 스튜디오 (로컬).lnk`, HTTP 200 | - |

## 렌더링 계약 확인
- 프로젝트 홈, 페이지 썸네일, 편집 미리보기, 피드, ExportStage가 모두 `CardRenderer`를 호출합니다.
- overlayImage는 템플릿 바깥의 공통 z-index 20 레이어이며 저장·복제·JSON·PNG·ZIP에서 같은 데이터를 사용합니다.
- ExportStage는 `position: fixed; left: -2000px`의 1080×1350 DOM이며 `display:none`을 사용하지 않습니다.
- `awaitImagesReady`, `document.fonts.ready`, requestAnimationFrame/100ms 경합 두 번을 캡처 직전에 실행합니다.
- KoPubWorld와 Pretendard 파일 및 각 라이선스 원문을 `public/fonts`에 포함했습니다.

## 제한 및 위험
- 서버·계정·클라우드 동기화는 PRD 범위 밖이며 데이터는 현재 브라우저 localStorage에 저장됩니다.
- Git 커밋·푸시·Vercel 배포는 요청되지 않아 수행하지 않았습니다.
- Playwright 실행 로그의 `NO_COLOR` 문구는 Node 테스트 러너 환경 경고이며 웹앱 브라우저 콘솔 경고가 아닙니다. 실제 Chromium 콘솔은 error 0건, warning 0건입니다.
