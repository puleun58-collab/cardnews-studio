# 카드뉴스 스튜디오

글과 사진을 입력해 1080×1350 카드뉴스를 만들고 PNG 또는 ZIP으로 저장하는 로컬 우선 웹앱입니다. 프로젝트와 페이지는 브라우저에 자동 저장되며, 데스크톱과 모바일 편집 화면을 지원합니다.

- 로컬 주소: `http://127.0.0.1:5273`
- 기술 구성: React 18, TypeScript, Vite, Zustand, Playwright
- 화면 구성: 흰색 캔버스, 절제된 브라운 포인트, 반응형 편집 화면
- 글꼴 구성: Pretendard(UI·카드), Noto Serif KR Variable(홈 제목), Noto Sans KR Variable·Bebas Neue·Georgia·Courier New(카드 선택 글꼴)

## 주요 기능

- 9개 템플릿을 이용한 카드뉴스 제작
- 썸네일 갤러리에서 템플릿을 보면서 선택
- 프로젝트와 페이지 생성, 복제, 순서 변경, 삭제
- 텍스트·이미지 편집, 캔버스 드래그앤드롭과 실시간 미리보기
- Pretendard, Noto Sans KR, Bebas Neue, Georgia, Courier New 글꼴 선택
- 기본·고급 디자인 설정과 텍스트 넘침 안내
- 최근 20단계 실행 취소·다시 실행과 50%, 75%, 100%, 화면 맞춤 미리보기
- 브라우저 자동 저장과 JSON 가져오기·내보내기
- 1080×1350 PNG 및 여러 페이지 ZIP 내보내기
- 프로젝트별 캔버스 크기 선택과 실제 크기 PNG·ZIP 출력
- 데스크톱·태블릿·모바일 반응형 UI
- 키보드 포커스, 상태 안내, reduced-motion을 포함한 접근성 지원

새 프로젝트는 템플릿 구성 또는 이미지 한 장으로 바로 시작할 수 있습니다. 편집 화면에서 이미지를 캔버스에 놓으면 사진 템플릿에서는 배경 이미지로, 다른 템플릿에서는 떠있는 이미지로 추가됩니다.

## 지원 캔버스 크기

- 인스타그램 세로: 1080×1350
- 정사각형: 1080×1080
- 스토리: 1080×1920
- 사용자 지정: 너비와 높이 각각 320~4096px

새 프로젝트를 만들 때 규격을 선택하거나 편집 화면의 `캔버스 크기`에서 변경할 수 있습니다. 사용자 지정 크기는 카드뉴스 레이아웃을 보호하기 위해 높이가 너비보다 작아지지 않도록 보정됩니다. 선택한 크기는 프로젝트와 JSON에 저장되며 PNG와 ZIP에도 그대로 적용됩니다. 이전 버전 JSON에는 기본 크기 1080×1350이 자동 적용됩니다.

## 템플릿 구성

- 강한 표지
- 미드나이트 문장
- 숫자 강조
- 인사이트 목록
- 단계 설명
- 양쪽 비교
- 인용과 해설
- 사진과 글
- 구분·마무리

`인사이트 7장` 추천 구성은 표지에서 시작해 핵심 수치, 목록, 과정, 비교, 이미지 설명, 마무리 순서로 생성됩니다. 이전 프로젝트의 `기본 인용` 템플릿은 JSON과 저장 데이터 호환을 위해 계속 렌더링되지만 신규 선택 목록에서는 제외됩니다.

## 배포 주소

- 프로덕션: [https://cardnews-studio.vercel.app](https://cardnews-studio.vercel.app)
- 최신 배포는 Vercel 프로덕션 별칭에 연결됩니다.

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
npm run verify:ui
npm run verify:a11y
npm run verify:exports
npm run verify:brand
npm run verify:lighthouse
```

- `verify:ui`: 프로젝트 생성, 템플릿, 모바일 화면, 자동 저장, JSON 오류 처리를 검사합니다.
- `verify:a11y`: 홈과 편집기의 자동 접근성 위반, 키보드 포커스, 터치 영역, 반응형 레이아웃을 검사합니다.
- `verify:exports`: PNG 1080×1350, 로컬 글꼴, 떠있는 이미지와 ZIP 순서를 검사합니다.
- `verify:brand`: 제거 대상 브랜드 문자열이 남았는지 검사합니다.
- `verify:lighthouse`: 성능, 접근성, 웹 표준과 검색 최적화 기준을 검사합니다.

## 3. 폴더 구조

```text
cardnews-studio/
├─ public/
│  └─ fonts/                  # Pretendard·KoPubWorld 글꼴과 라이선스
├─ scripts/
│  ├─ start-local.ps1         # 서버 확인·실행 후 브라우저 열기
│  ├─ install-local-shortcut.ps1
│  ├─ verify-brand.mjs
│  └─ verify-lighthouse.mjs
├─ src/
│  ├─ brand/                  # 브랜드 색상·글꼴·디자인 기본값
│  ├─ components/             # 편집기, 미리보기, 공통 CardRenderer
│  ├─ config/appConfig.ts     # 앱 이름·계정·파일명·저장 제한
│  ├─ engine/                 # 이미지 처리, AutoFit, PNG·ZIP 내보내기
│  ├─ registry/               # 템플릿 manifest 레지스트리
│  ├─ store/                  # 프로젝트 상태와 localStorage 저장
│  ├─ styles/                 # 앱·카드·글꼴 스타일
│  ├─ templates/              # 카드 템플릿 컴포넌트
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
- 미드나이트 디자인과 글꼴: `src/brand/midnightDesign.ts`
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

큰 이미지를 여러 장 넣으면 브라우저 localStorage 용량을 초과할 수 있습니다.

1. 먼저 프로젝트를 JSON으로 저장합니다.
2. 불필요한 이미지나 프로젝트를 줄입니다.
3. 브라우저 사이트 데이터가 삭제되지 않도록 주의합니다.

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
npx vercel inspect https://cardnews-studio.vercel.app
```

## 6. 데이터와 보안

- 사용자 글과 이미지는 기본적으로 현재 브라우저 안에 저장됩니다.
- 중요한 프로젝트는 JSON으로 정기 백업하세요.
- 비밀번호, API 키, 인증 코드는 저장소나 `.env` 파일에 커밋하지 마세요.
- `.env`와 테스트 결과, 빌드 결과, 로컬 세션 데이터는 `.gitignore`에서 제외됩니다.
