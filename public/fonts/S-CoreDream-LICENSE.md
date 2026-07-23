# 에스코어드림

[배포처 바로가기](https://s-core.co.kr/company/font2/)

&nbsp;

## 웹 폰트

사용하는 `font-family`의 이름은 `S-Core Dream`입니다.

### HTML

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/S-CoreDream.css" type="text/css"/>
```

### CSS `@Import`

```css
@import url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/S-CoreDream.css');
```

### CSS `@font-face`

```css
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 100;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamThin.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamThin.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamThin.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 200;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraLight.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraLight.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraLight.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 300;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamLight.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamLight.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamLight.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 400;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamRegular.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamRegular.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamRegular.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 500;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamMedium.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamMedium.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamMedium.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 600;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBold.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBold.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBold.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 700;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraBold.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraBold.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamExtraBold.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 800;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamHeavy.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamHeavy.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamHeavy.otf') format('opentype');
}
@font-face {
    font-family: 'S-Core Dream';
    font-weight: 900;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBlack.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBlack.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/SCDreamBlack.otf') format('opentype');
}
```

&nbsp;

## 다이나믹 서브셋

웹폰트의 최적화를 위해 모던 브라우저에서는 글리프를 여러개로 나누어 필요한 부분만 동적으로 파싱하는 다이나믹 서브셋을 제공합니다. 폰트의 용량이 부담된다면 아래 코드를 사용하는 걸 추천합니다.

### HTML

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/subsets/S-CoreDream-dynamic-subset.css" type="text/css"/>
```

### CSS

```css
@import url('https://cdn.jsdelivr.net/gh/fonts-archive/S-CoreDream/subsets/S-CoreDream-dynamic-subset.css');
```

&nbsp;

## font-family

어느 브라우저나 시스템 환경에서도 동일한 폰트가 적용되어야 한다면 아래와 같이 구성하는 걸 추천합니다. `-apple-system`과 `BlinkMacSystemFont`는 맥, `Segoe UI`는 윈도우, `Roboto`는 안드로이드의 기본 폰트입니다.

```css
font-family: "S-Core Dream", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
```

&nbsp;

## 라이선스

라이선스는 언제든지 변경될 수 있습니다. 변경사항을 확인하려면 배포처를 방문해 주세요.

```
1. S-Core 홈페이지를 통해 배포되는 에스코어 글꼴의 지적 재산권은 S-Core에 있습니다.
2. 에스코어 글꼴은 개인 및 기업 사용자를 포함한 모든 사용자에게 무료로 제공되며 자유롭게 재배포 하실 수 있습니다.
3. 에스코어 글꼴은 어떠한 이유로도 지적 재산권 이외의 사용자가 수정, 판매할 수 없으며 배포되는 형태 그대로 사용해야 합니다.
4. 에스코어 글꼴은 본 저작권 안내를 포함해서 다른 소프트웨어와 번들하거나 재배포 또는 판매가 가능합니다. 에스코어 글꼴 저작권 안내를 포함하기 어려울 경우, 에스코어 글꼴의 출처 표기를 권장합니다.
5. 예) 이 페이지에는 S-Core에서 제공한 에스코어 드림이 적용되어 있습니다.
6. 에스코어 글꼴을 사용한 인쇄물, 광고물(온라인 포함)의 이미지는 S-Core의 프로모션을 위해 활용될 수 있습니다. 이를 원치 않을 경우, 언제든지 당사에 요청하실 수 있습니다.
```
