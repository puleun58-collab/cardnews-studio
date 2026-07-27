export const createId = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const isValidIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))

export const clone = <T>(value: T): T => structuredClone(value)
