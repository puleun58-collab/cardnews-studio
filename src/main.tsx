import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { appConfig } from './config/appConfig'
import { brandTokens } from './brand/tokens'

document.title=appConfig.appName
const description=document.querySelector<HTMLMetaElement>('meta[name="description"]')
if(description)description.content=appConfig.appDescription
const theme=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
if(theme)theme.content=brandTokens.color.midnight
for(const [name,value] of Object.entries({midnight:brandTokens.color.midnight,navy:brandTokens.color.navy,cream:brandTokens.color.cream,accent:brandTokens.color.accent}))document.documentElement.style.setProperty(`--${name}`,value)
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
