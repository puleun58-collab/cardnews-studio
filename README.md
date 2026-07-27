# 카드뉴스 스튜디오

글과 사진을 입력해 1080×1350 카드뉴스를 만들고 PNG 또는 ZIP으로 저장하는 로컬 우선 웹앱입니다. 프로젝트와 페이지는 브라우저의 IndexedDB에 자동 저장되며, 데스크톱과 모바일 편집 화면을 지원합니다.

## 배포 주소

- 프로덕션: [https://cardnews-studio-inky.vercel.app](https://cardnews-studio-inky.vercel.app)

## 프로젝트 정보

- 로컬 주소: `http://127.0.0.1:5273`
- 기술 구성: React 18, TypeScript, Vite, Zustand, IndexedDB, Vitest, Playwright
- 화면 구성: 흰색 캔버스, 절제된 브라운 포인트, 반응형 편집 화면
- 글꼴 구성: Pretendard(UI), 한글 9종과 영문·숫자 4종을 조합하는 카드 타이포그래피

## 주요 기능

- 9개 템플릿을 이용한 카드뉴스 제작
- 썸네일 갤러리에서 템플릿을 보면서 선택
- 프로젝트와 페이지 생성, 복제, 삭제
- 페이지 썸네일을 클릭해 편집 페이지를 전환하고 드래그해 순서 변경
- 텍스트 편집과 클릭·드래그앤드롭 방식의 전체 배경 이미지 업로드
- 미리보기 좌측 하단에서 떠있는 이미지를 추가하고 캔버스에서 직접 이동·크기 조절·삭제
- 모든 템플릿에서 배경색·글자색·한글/영문 글꼴·그라데이션·페이지 번호 설정
- 템플릿 하단에는 계정명을 표시하지 않고, 선택한 경우에만 페이지 번호 표시
- 템플릿 구조에 맞춘 제목·본문 크기, 목록 간격, 영역 비율과 정렬 설정
- 템플릿별 기본 디자인으로 되돌리는 디자인 초기화
- 한글 9종(Pretendard, Noto Sans KR, 나눔스퀘어 네오, 에스코어 드림, G마켓 산스, 페이퍼로지, 여기어때 잘난체, Cafe24 써라운드, Noto Serif KR) 선택
- 영문·숫자 4종(Manrope, Oswald, Cormorant Garamond, IBM Plex Mono)을 한글 글꼴과 독립적으로 조합
- 글꼴을 바꿔도 편집 패널의 현재 스크롤 위치 유지
- 기본 디자인·레이아웃·고급 설정과 텍스트 넘침 안내
- 최근 20단계 실행 취소·다시 실행과 50%, 75%, 100%, 화면 맞춤 미리보기
- 프로젝트별 500ms debounce 자동 저장, 저장 상태·마지막 저장 시각·저장 실패 복구 UI
- IndexedDB 프로젝트·페이지 저장과 Blob 이미지 분리·중복 제거
- 기존 localStorage 프로젝트 자동 이전과 원본 보존
- 단일 프로젝트 및 전체 작업공간 JSON 가져오기·내보내기
- 1080×1350 PNG 및 여러 페이지 ZIP 내보내기
- 프로젝트별 캔버스 크기 선택과 실제 크기 PNG·ZIP 출력
- 데스크톱·태블릿·모바일 반응형 UI
- 키보드 포커스, 상태 안내, reduced-motion을 포함한 접근성 지원

새 프로젝트는 하나의 템플릿 선택 흐름으로 시작합니다. 편집 화면의 `배경 이미지 업로드` 영역에 이미지를 놓으면 카드 전체 배경으로 적용됩니다. 사진형 템플릿의 `템플릿 사진 영역`에서는 콘텐츠 사진을 별도로 교체할 수 있습니다. 떠있는 이미지는 미리보기 좌측 하단의 `이미지 추가`로 불러온 뒤 드래그로 이동하고, 모서리 핸들로 비율을 유지하며 크기를 조절하거나 `×` 버튼과 Delete 키로 삭제할 수 있습니다.

한글 글꼴과 영문·숫자 글꼴은 별도로 저장됩니다. 영문 글꼴을 먼저 적용하고 한글 문자는 선택한 한글 글꼴로 자연스럽게 대체하는 폴백 구조라서 숫자 중심 카드와 한글 본문 카드의 인상을 독립적으로 조절할 수 있습니다. 이전 버전의 Bebas Neue, Georgia, Courier New, KoPub 설정은 각각 가장 가까운 새 조합으로 자동 변환됩니다.

## 저장 구조와 데이터 이전

브라우저 저장소는 외부 라이브러리 없이 기본 IndexedDB API로 구현합니다. `projects`, `pages`, `images`, `meta` 저장소를 분리하며 프로젝트 메타데이터와 페이지 순서, 페이지 데이터, 이미지 Blob, 마이그레이션 완료 정보를 각각 저장합니다. Zustand 스토어는 IndexedDB를 직접 호출하지 않고 `ProjectRepository`와 저장 조정 계층을 통해 접근합니다.

- 텍스트와 디자인 변경은 마지막 입력 후 500ms 뒤 해당 프로젝트와 변경 페이지를 저장합니다.
- 프로젝트·페이지 삭제, 복제, 순서 변경, JSON 가져오기는 즉시 저장 큐에 반영합니다.
- 프로젝트별 저장 요청을 직렬화하고 수정 리비전을 비교해 오래된 요청이 최신 상태를 덮어쓰지 않게 합니다.
- 탭 숨김과 페이지 종료 시 저장을 flush하며, 즉시 새로고침에 대비해 변경 프로젝트만 `sessionStorage` 복구 저널에 임시 보관합니다. 다음 실행에서 최신 수정 시각을 비교해 복원한 뒤 저널을 삭제합니다.
- `navigator.storage.estimate()`로 사용량을 확인하고 저장 공간의 85% 이상을 사용하면 사전 경고합니다.
- 프로젝트 삭제 시 연결 페이지와 사용하지 않는 이미지 Blob을 정리합니다. 저장소 관리 화면에서도 고아 이미지를 수동 정리할 수 있습니다.
- 같은 이미지 Blob은 SHA-256 해시 ID를 사용해 한 번만 저장합니다.

이전 저장 키 `cardnews-studio-hageon-v1`이 있으면 최초 실행 시 프로젝트를 검증하고 스키마를 한 단계씩 최신 버전으로 변환한 뒤 IndexedDB로 이전합니다. 이전이 모두 성공하기 전에는 기존 값을 삭제하지 않으며, 성공 후에도 복구용 원본을 해당 키에 계속 유지합니다. 완료 정보는 IndexedDB `meta`에 기록해 중복 이전을 막습니다. 일부 저장만 성공한 뒤 다시 시도하더라도 기존 프로젝트 ID로 upsert하므로 중복 프로젝트가 만들어지지 않습니다. 손상된 JSON은 원본 키와 `cardnews-studio-hageon-v1-corrupt-{시각}` 키에 보존하고 지속 경고를 표시합니다.

## 이미지와 JSON 백업 정책

- 업로드: JPG, PNG, WebP, 파일당 최대 20MB, 최대 4천만 픽셀
- 처리: 긴 변을 최대 2400px로 축소하며 PNG는 PNG, JPG·WebP는 품질 0.9 WebP로 저장
- 앱 내부: IndexedDB `images` 저장소의 Blob
- 런타임과 기존 JSON: 기존 렌더링·PNG/ZIP·JSON 호환을 위해 Data URL 유지
- 이미지 포함 전체 백업: 프로젝트·디자인·모든 이미지를 포함해 다른 브라우저에서도 완전히 복원할 수 있음
- 이미지 제외 경량 백업: 프로젝트 구조와 텍스트·디자인만 포함하며 배경·콘텐츠·오버레이 이미지는 복원되지 않음
- JSON 가져오기 상한: 전체 백업을 고려해 100MB

기존 schemaVersion 1 JSON은 계속 가져올 수 있습니다. 새 백업은 schemaVersion 2로 저장되며, 현재 앱보다 높은 버전은 원본을 변경하지 않고 거부합니다. 홈 하단 `브라우저 저장소 관리`는 우측 `＋/−` 버튼으로 열고 닫을 수 있습니다. 저장소 초기화는 이미지 포함 전체 백업 권장 안내와 두 번의 확인 후에만 실행됩니다.

런타임 검증은 알 수 없는 최상위 필드를 무시하고, 알려진 필드만 새 객체로 복사합니다. 잘못된 템플릿과 중복 페이지 ID, 타입이 다른 콘텐츠, 범위를 벗어난 캔버스와 미래 버전은 거부합니다. 이전 버전에서 빠진 선택 속성은 기본값으로 보완하고 디자인 수치는 안전 범위로 정규화합니다. 개발자용 상세 오류는 경로별 이슈로 유지하며 UI에는 복구 가능한 한국어 메시지만 표시합니다.

Vitest와 `fake-indexeddb`는 브라우저 저장 코드의 단위 테스트에만 사용하는 개발 의존성입니다. 실제 앱은 추가 IndexedDB 래퍼를 포함하지 않아 번들 크기와 추상화 비용을 줄였고, 대신 트랜잭션과 오류 처리를 프로젝트 저장소 계층에서 명시적으로 관리합니다.

## 디자인 설정

모든 템플릿은 동일한 `기본 디자인` 영역에서 배경색, 글자색, 그라데이션, 한글 글꼴, 영문·숫자 글꼴을 변경할 수 있습니다. `레이아웃 설정`에는 현재 템플릿에 필요한 항목만 나타나며, `고급 설정`에서는 정렬, 자간, 행간, 본문 너비와 페이지 번호 표시를 조정합니다. `초기화`를 누르면 내용과 이미지는 유지한 채 현재 템플릿의 디자인 설정만 기본값으로 되돌립니다.

템플릿별 레이아웃 설정:

- 임팩트 표지: 제목 크기, 보조 문장 크기, 정렬과 콘텐츠 너비
- 문장 카드: 본문 크기, 정렬과 콘텐츠 너비
- 핵심 수치: 핵심 숫자 크기, 제목 크기, 정렬과 콘텐츠 너비
- 핵심 인사이트: 제목 크기, 목록 글자 크기와 목록 간격
- 단계별 가이드: 제목 크기, 단계 글자 크기와 단계 행 높이
- 비교 분석: 제목 크기, 항목 글자 크기와 좌우 영역 비율
- 인용·해설: 인용문 크기, 해설 크기와 인용 영역 높이
- 이미지 스토리: 제목 크기, 본문 크기와 이미지 영역 높이
- 마무리 카드: 제목 크기, 행동 문구 크기, 정렬과 콘텐츠 너비

기존 문장 카드의 디자인 설정과 이전 JSON 파일은 그대로 불러올 수 있습니다. 새 디자인 값은 페이지별로 브라우저 자동 저장과 JSON 내보내기에 함께 포함됩니다.

## 지원 캔버스 크기

- 인스타그램: 1080×1350
- 정사각형: 1080×1080
- 스토리: 1080×1920
- 사용자 지정: 너비와 높이 각각 320~4096px

새 프로젝트를 만들 때 규격을 선택하거나 편집 화면의 `캔버스 크기`에서 변경할 수 있습니다. 사용자 지정 크기는 카드뉴스 레이아웃을 보호하기 위해 높이가 너비보다 작아지지 않도록 보정됩니다. 선택한 크기는 프로젝트와 JSON에 저장되며 PNG와 ZIP에도 그대로 적용됩니다. 이전 버전 JSON에는 기본 크기 1080×1350이 자동 적용됩니다.

## 템플릿 구성

- 임팩트 표지
- 문장 카드
- 핵심 수치
- 핵심 인사이트
- 단계별 가이드
- 비교 분석
- 인용·해설
- 이미지 스토리
- 마무리 카드

`9장의 인사이트 스토리` 구성은 표지에서 시작해 문장, 핵심 수치, 목록, 과정, 비교, 인용·해설, 이미지 설명, 마무리 순서로 생성됩니다. 이전 프로젝트의 `기본 인용` 템플릿은 JSON과 저장 데이터 호환을 위해 계속 렌더링되지만 신규 선택 목록에서는 제외됩니다.

## 1. 설치 방법

### 준비 사항

- Windows 10 또는 11
- Node.js LTS와 npm
- 권장 브라우저: Chrome 또는 Edge

Node.js 설치 여부를 확인합니다.

```powershell
node --version
npm --version
```

저장소를 내려받고 의존성을 설치합니다.

```powershell
git clone https://github.com/puleun58-collab/cardnews-studio.git
cd cardnews-studio
npm install
```

이미 프로젝트 폴더가 있다면 해당 폴더에서 `npm install`만 실행하면 됩니다.

## 2. 실행 방법

### 고정 로컬 주소로 실행

```powershell
npm run local
```

브라우저에서 다음 주소를 엽니다.

```text
http://127.0.0.1:5273
```

서버를 종료하려면 실행 중인 터미널에서 `Ctrl + C`를 누릅니다.

### 개발 서버 실행

```powershell
npm run dev
```

### 프로덕션 빌드 확인

```powershell
npm run build
npm run preview
```

### 품질 검사

```powershell
npm run lint
npm run test:unit
npm run verify:ui
npm run verify:a11y
npm run verify:exports
npm run verify:brand
npm run verify:lighthouse
```

- `test:unit`: 정규화, 스키마 마이그레이션, 페이지 경계 검사, 템플릿 매핑, IndexedDB CRUD, localStorage 이전, debounce·재시도를 검사합니다.
- `verify:ui`: 프로젝트 생성, 템플릿, IndexedDB 자동 저장·이전, 이미지 Blob 분리, 새로고침 복구, 모바일 화면을 검사합니다.
- `verify:a11y`: 홈과 편집기의 자동 접근성 위반, 키보드 포커스, 터치 영역, 반응형 레이아웃을 검사합니다.
- `verify:exports`: PNG 1080×1350, 로컬 글꼴, 떠있는 이미지와 ZIP 순서를 검사합니다.
- `verify:brand`: 제거 대상 브랜드 문자열이 남았는지 검사합니다.
- `verify:lighthouse`: 성능, 접근성, 웹 표준과 검색 최적화 기준을 검사합니다.

## 3. 폴더 구조

```text
cardnews-studio/
├─ public/
│  └─ fonts/                  # 로컬 한글 웹폰트와 각 배포 라이선스
├─ scripts/
│  ├─ start-local.ps1         # 서버 확인·실행 후 브라우저 열기
│  ├─ install-local-shortcut.ps1
│  ├─ verify-brand.mjs
│  └─ verify-lighthouse.mjs
├─ src/
│  ├─ brand/                  # 브랜드 색상·글꼴·디자인 기본값
│  ├─ components/             # 편집기, 미리보기, 공통 CardRenderer
│  ├─ config/appConfig.ts     # 앱 이름·파일명·저장 및 이미지 제한
│  ├─ domain/                 # 프로젝트·페이지 생성, 복제, 순서와 템플릿 매핑
│  ├─ engine/                 # 이미지 처리, AutoFit, PNG·ZIP 내보내기
│  ├─ migrations/             # 버전별 프로젝트 스키마 마이그레이션
│  ├─ repositories/           # 저장소 인터페이스와 IndexedDB 구현
│  ├─ registry/               # 템플릿 manifest 레지스트리
│  ├─ storage/                # IndexedDB 연결, 이미지 Blob, legacy 이전
│  ├─ store/                  # UI 상태와 debounce 저장 조정
│  ├─ styles/                 # 앱·카드·글꼴 스타일
│  ├─ templates/              # 카드 템플릿 컴포넌트
│  ├─ validation/             # 런타임 프로젝트 검증과 정규화
│  ├─ App.tsx
│  ├─ compositions.ts         # 추천 페이지 구성
│  └─ types.ts
├─ tests/                     # Playwright UI·접근성·JSON·내보내기 검사
├─ PROGRESS.md                # 구현 및 검증 증거
├─ package.json
└─ playwright.config.ts
```

### 주요 설정 파일

- 앱 이름, 계정명, 파일 슬러그, 저장 제한: `src/config/appConfig.ts`
- 브랜드 색상과 카드 크기: `src/brand/tokens.ts`
- 공통 카드 디자인과 글꼴: `src/brand/cardDesign.ts`
- 홈·편집기 레이아웃과 반응형 스타일: `src/styles/app.css`
- 템플릿 입력 필드와 기본 내용: `src/registry/templateRegistry.ts`
- 한 장/여러 장 추천 구성: `src/compositions.ts`

## 4. 자동 실행 방법

### 스크립트로 바로 열기

PowerShell에서 다음 명령을 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

스크립트는 다음 작업을 수행합니다.

1. `http://127.0.0.1:5273` 응답을 확인합니다.
2. 서버가 꺼져 있으면 숨김 창에서 `npm run local`을 실행합니다.
3. 최대 30초 동안 서버 준비를 기다립니다.
4. 준비되면 기본 브라우저로 앱을 엽니다.

### 바탕 화면 바로가기 설치

프로젝트 폴더에서 다음 명령을 한 번 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-local-shortcut.ps1
```

바탕 화면에 `카드뉴스 스튜디오 (로컬)` 바로가기가 생성됩니다. 이후에는 이 바로가기를 실행하면 서버 확인, 서버 시작, 브라우저 열기가 자동으로 진행됩니다.

설치 결과를 창 없이 확인하려면 다음 명령을 사용합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-local-shortcut.ps1 -Silent
```

## 5. 오류 대응 방법

### `node` 또는 `npm`을 찾을 수 없음

Node.js LTS를 설치한 뒤 모든 터미널을 닫고 다시 엽니다.

```powershell
node --version
npm --version
```

### `npm install` 실패

네트워크 연결을 확인하고 npm 캐시를 검사한 뒤 다시 설치합니다.

```powershell
npm cache verify
npm install
```

문제가 계속되면 `node_modules`를 제거하고 다시 설치합니다.

```powershell
Remove-Item -Recurse -Force .\node_modules
npm install
```

### 5273 포트를 이미 사용 중임

먼저 브라우저에서 `http://127.0.0.1:5273`을 열어 기존 카드뉴스 스튜디오가 실행 중인지 확인합니다. 다른 프로그램이 포트를 사용한다면 해당 프로그램을 종료한 뒤 `npm run local`을 다시 실행합니다.

사용 중인 프로세스 확인:

```powershell
Get-NetTCPConnection -LocalPort 5273 -ErrorAction SilentlyContinue
```

### 화면이 열리지 않음

프로젝트 폴더에서 아래 명령을 직접 실행하고 터미널 오류를 확인합니다.

```powershell
npm install
npm run local
```

그다음 `http://127.0.0.1:5273`을 새로 엽니다.

### 자동 저장 실패 또는 저장 공간 부족

큰 이미지를 여러 장 넣으면 브라우저가 사이트별로 허용한 IndexedDB 용량에 가까워질 수 있습니다.

1. 지속 경고 영역의 `JSON 백업 내보내기`로 먼저 백업합니다.
2. `다시 저장`을 눌러 일시적인 접근 오류인지 확인합니다.
3. `사용하지 않는 이미지 정리`를 실행하고 불필요한 이미지나 프로젝트를 줄입니다.
4. 홈 하단의 저장소 사용량과 초기화 안내를 확인합니다.

프로젝트의 기본 저장 위치는 서버가 아니라 현재 브라우저입니다.

### PNG 또는 ZIP 저장 실패

- 이미지 파일이 JPG, PNG 또는 WebP인지 확인합니다.
- 이미지가 20MB 이하인지 확인합니다.
- 글꼴과 이미지 로딩이 끝날 때까지 기다린 뒤 다시 시도합니다.
- `npm run verify:exports`로 내보내기 기능을 검사합니다.

### PowerShell 실행 정책 오류

스크립트 파일에만 우회 옵션을 적용합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

시스템 전체 실행 정책을 변경할 필요는 없습니다.

### 테스트에서 Chromium을 찾을 수 없음

```powershell
npx playwright install chromium
npm run verify:ui
```

### 공개 주소에는 이전 화면이 보임

브라우저에서 `Ctrl + Shift + R`로 강력 새로고침합니다. 배포 상태는 다음 명령으로 확인할 수 있습니다.

```powershell
npx vercel inspect https://cardnews-studio-inky.vercel.app
```

## 6. 데이터와 보안

- 사용자 글과 이미지는 기본적으로 현재 브라우저 IndexedDB 안에 저장됩니다.
- 중요한 프로젝트는 이미지 포함 전체 JSON과 이미지 제외 경량 JSON 중 목적에 맞는 형식으로 정기 백업하세요.
- 기존 localStorage 이전 원본은 사용자가 저장소를 직접 초기화하기 전까지 보존됩니다.
- 비밀번호, API 키, 인증 코드는 저장소나 `.env` 파일에 커밋하지 마세요.
- `.env`와 테스트 결과, 빌드 결과, 로컬 세션 데이터는 `.gitignore`에서 제외됩니다.
