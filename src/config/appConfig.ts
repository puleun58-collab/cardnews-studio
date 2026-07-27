export interface AppConfig {
  appName: string
  appDescription: string
  fileSlug: string
  storageKey: string
  maxPages: number
  maxJsonBytes: number
  maxImageBytes: number
  maxImagePixels: number
}
export const appConfig: AppConfig = {
  appName: 'CARDNEWS STUDIO',
  appDescription: '글과 사진으로 만드는 세로형 카드뉴스',
  fileSlug: 'my-card-studio',
  storageKey: 'cardnews-studio-hageon-v1',
  maxPages: 100,
  maxJsonBytes: 6 * 1024 * 1024,
  maxImageBytes: 20 * 1024 * 1024,
  maxImagePixels: 40_000_000,
}
