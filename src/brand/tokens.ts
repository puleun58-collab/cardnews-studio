export const brandTokens = {
  color: { midnight: '#141C33', navy: '#1E2A47', cream: '#FAF5EA', accent: '#F5A83B', white: '#FFFFFF', ink: '#172033' },
  card: { width: 1080, height: 1350, safeX: 96, safeY: 84 },
  radius: { sm: 10, md: 18, lg: 28 },
  ui: {
    color: {
      canvas: '#0A0D13',
      surface: '#11161E',
      surfaceRaised: '#181E28',
      surfaceSubtle: '#0E131B',
      border: '#29313D',
      borderStrong: '#3C4654',
      text: '#EEEAE1',
      textMuted: '#A9B0BA',
      accent: '#D6A054',
      success: '#86C5A3',
      danger: '#E8A19D',
      dangerSurface: '#2B1C21',
    },
    container: { max: 1280 },
    radius: { control: 6, panel: 8, feature: 12 },
    shadow: {
      preview: '0 26px 72px rgba(2, 6, 13, 0.42)',
      floating: '0 22px 64px rgba(2, 6, 13, 0.32)',
    },
  },
} as const
