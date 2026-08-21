/**
 * Piper TTS base URLs — shared defaults for relay-gateway hosts (Caddy → clevertree-tts).
 */

export const DEFAULT_PIPER_API_BASES = [
  'https://iad1.relaygateway.net',
  'https://hkg1.relaygateway.net',
  'https://sjc1.relaygateway.net',
] as const

function normalizeBaseUrl (raw: string): string {
  return raw
    .trim()
    .replace(/lon1\.relaygateway\.net/gi, 'iad1.relaygateway.net')
    .replace(/dfw1\.relaygateway\.net/gi, 'iad1.relaygateway.net')
    .replace(/\/+$/, '')
}

function parseBases (raw: string | undefined): string[] {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of trimmed.split(/\s+/)) {
    const n = normalizeBaseUrl(s)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/** Server / build-time (`PIPER_API_URLS` or `PIPER_API_URL`). */
export function getServerPiperApiBaseUrls (): string[] {
  const fromList = parseBases(process.env.PIPER_API_URLS)
  if (fromList.length > 0) return fromList
  const single = normalizeBaseUrl(process.env.PIPER_API_URL ?? '')
  return single ? [single] : [...DEFAULT_PIPER_API_BASES]
}

/** Browser (`NEXT_PUBLIC_PIPER_API_URLS` or `NEXT_PUBLIC_PIPER_API_URL`). */
export function getClientPiperApiBaseUrls (): string[] {
  const fromList = parseBases(process.env.NEXT_PUBLIC_PIPER_API_URLS)
  if (fromList.length > 0) return fromList
  const single = normalizeBaseUrl(process.env.NEXT_PUBLIC_PIPER_API_URL ?? '')
  return single ? [single] : [...DEFAULT_PIPER_API_BASES]
}

export function getServerPiperApiSecret (): string {
  return process.env.PIPER_API_SECRET ?? ''
}

export function getClientPiperApiSecret (): string {
  return process.env.NEXT_PUBLIC_PIPER_API_SECRET ?? ''
}
