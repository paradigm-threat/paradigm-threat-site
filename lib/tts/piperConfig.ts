/**
 * Piper TTS — multi-host upstream (see `piperUpstream.ts`).
 *
 * Set **PIPER_API_URLS** (preferred) or **PIPER_API_URL** (single host), plus optional **PIPER_API_SECRET**
 * in `.env.local` / Vercel (never commit secrets).
 */

export {
    getPiperApiBaseUrls,
    getPiperApiSecret,
    isPiperConfigured,
    fetchPiperTtsUpstream,
    aggregatePiperVoices,
} from './piperUpstream'

import { getPiperApiBaseUrls, getPiperApiSecret } from './piperUpstream'

/** First configured base URL (legacy); prefer **getPiperApiBaseUrls()**. */
export const PIPER_API_URL: string = getPiperApiBaseUrls()[0] ?? ''

export const PIPER_API_SECRET: string = getPiperApiSecret()
