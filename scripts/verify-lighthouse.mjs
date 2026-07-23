import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { join } from 'node:path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { build } from 'vite'

const port = 5275
const url = `http://127.0.0.1:${port}`
const thresholds = { performance: 0.85, accessibility: 0.95, 'best-practices': 0.95, seo: 0.9 }
let preview
let chrome
let profileDirectory

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
  }
  throw new Error('Lighthouse용 미리보기 서버를 시작하지 못했습니다.')
}

try {
  await build({ logLevel: 'warn' })
  preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  await waitForServer()
  profileDirectory = await mkdtemp(join(tmpdir(), 'cardnews-lighthouse-'))
  chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'], userDataDir: profileDirectory })
  const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(thresholds) })
  if (!result) throw new Error('Lighthouse 결과를 생성하지 못했습니다.')

  const scores = Object.fromEntries(Object.keys(thresholds).map((category) => [category, result.lhr.categories[category].score ?? 0]))
  for (const [category, minimum] of Object.entries(thresholds)) {
    if (scores[category] < minimum) throw new Error(`${category} 점수 ${(scores[category] * 100).toFixed(0)}가 기준 ${(minimum * 100).toFixed(0)}보다 낮습니다.`)
  }
  console.log(`Lighthouse 통과: ${Object.entries(scores).map(([category, score]) => `${category} ${(score * 100).toFixed(0)}`).join(', ')}`)
} finally {
  await chrome?.kill()
  preview?.kill()
  if (profileDirectory) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300))
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
}
