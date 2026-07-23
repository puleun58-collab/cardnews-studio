import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/noto-serif-kr'
import App from './App'
import { appConfig } from './config/appConfig'
import { brandTokens } from './brand/tokens'

document.title=appConfig.appName
const description=document.querySelector<HTMLMetaElement>('meta[name="description"]')
if(description)description.content=appConfig.appDescription
const theme=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
if(theme)theme.content=brandTokens.color.midnight
const cssTokens = {
  midnight: brandTokens.color.midnight,
  navy: brandTokens.color.navy,
  cream: brandTokens.color.cream,
  accent: brandTokens.color.accent,
  'ui-canvas': brandTokens.ui.color.canvas,
  'ui-surface': brandTokens.ui.color.surface,
  'ui-surface-raised': brandTokens.ui.color.surfaceRaised,
  'ui-surface-subtle': brandTokens.ui.color.surfaceSubtle,
  'ui-border': brandTokens.ui.color.border,
  'ui-border-strong': brandTokens.ui.color.borderStrong,
  'ui-text': brandTokens.ui.color.text,
  'ui-text-muted': brandTokens.ui.color.textMuted,
  'ui-accent': brandTokens.ui.color.accent,
  'ui-success': brandTokens.ui.color.success,
  'ui-danger': brandTokens.ui.color.danger,
  'ui-danger-surface': brandTokens.ui.color.dangerSurface,
}
for (const [name, value] of Object.entries(cssTokens)) {
  document.documentElement.style.setProperty(`--${name}`, value)
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
