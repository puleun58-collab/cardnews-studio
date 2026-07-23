# 지마켓 산스체

[배포처 바로가기](https://corp.gmarket.com/fonts/)

&nbsp;

## 웹 폰트

사용하는 `font-family`의 이름은 `Gmarket Sans`입니다.

### HTML

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css" type="text/css"/>
```

### CSS `@Import`

```css
@import url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSans.css');
```

### CSS `@font-face`

```css
@font-face {
    font-family: 'Gmarket Sans';
    font-weight: 300;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansLight.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansLight.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansLight.otf') format('opentype'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansLight.ttf') format('truetype');
}
@font-face {
    font-family: 'Gmarket Sans';
    font-weight: 500;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansMedium.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansMedium.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansMedium.otf') format('opentype'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansMedium.ttf') format('truetype');
}
@font-face {
    font-family: 'Gmarket Sans';
    font-weight: 700;
    font-style: normal;
    font-display: swap;
    src: url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansBold.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansBold.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansBold.otf') format('opentype'),
         url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/GmarketSansBold.ttf') format('truetype');
}
```

&nbsp;

## 다이나믹 서브셋

웹폰트의 최적화를 위해 모던 브라우저에서는 글리프를 여러개로 나누어 필요한 부분만 동적으로 파싱하는 다이나믹 서브셋을 제공합니다. 폰트의 용량이 부담된다면 아래 코드를 사용하는 걸 추천합니다.

### HTML

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/subsets/GmarketSans-dynamic-subset.css" type="text/css"/>
```

### CSS

```css
@import url('https://cdn.jsdelivr.net/gh/fonts-archive/GmarketSans/subsets/GmarketSans-dynamic-subset.css');
```

&nbsp;

## font-family

어느 브라우저나 시스템 환경에서도 동일한 폰트가 적용되어야 한다면 아래와 같이 구성하는 걸 추천합니다. `-apple-system`과 `BlinkMacSystemFont`는 맥, `Segoe UI`는 윈도우, `Roboto`는 안드로이드의 기본 폰트입니다.


```css
font-family: "Gmarket Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
```

&nbsp;

## 라이선스

라이선스는 언제든지 변경될 수 있습니다. 변경사항을 확인하려면 배포처를 방문해 주세요.

```
G마켓 브랜드 아이덴티티를 담은 서체 'Gmarket Sans'를 소개합니다.

Gmarket Sans는 다양한 브랜드, 판매자, 사용자가 함께 성장하며 가치를 나눌 수 있도록 만든 글꼴입니다.

누구나 아무 제약 없이 쉽게 사용할 수 있습니다.

Gmarket Sans는 누구나 제약 없이 자유롭게 수정하고 재배포 하실 수 있습니다.
```
