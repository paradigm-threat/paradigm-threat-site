import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SiteClaimEntry } from '@/lib/siteAi/siteClaimsTypes'
import { parseSiteClaimsJson } from '@/lib/siteAi/parseSiteClaims'
import { remoteRelay } from '@/lib/remoteRelayStore'

let cached: SiteClaimEntry[] | null = null
let inflight: Promise<SiteClaimEntry[] | null> | null = null
let overrideLoader: (() => Promise<SiteClaimEntry[] | null> | SiteClaimEntry[] | null) | null = null

const FIXTURE_PATHS = [
  join(process.cwd(), '../paradigm-threat-files/site-claims.json'),
  join(process.cwd(), 'data/site-claims.json'),
]

export function resetSiteClaimsCache (): void {
  cached = null
  inflight = null
}

/** Test hook — bypass Relay fetch. */
export function setSiteClaimsIndexOverride (
  loader: (() => Promise<SiteClaimEntry[] | null> | SiteClaimEntry[] | null) | null
): void {
  overrideLoader = loader
  resetSiteClaimsCache()
}

export function loadSiteClaimsFromFilesystem (): SiteClaimEntry[] | null {
  for (const path of FIXTURE_PATHS) {
    if (!existsSync(path)) continue
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
      return parseSiteClaimsJson(raw)
    } catch {
      continue
    }
  }
  return null
}

function resolveOverride (): SiteClaimEntry[] | null {
  if (!overrideLoader) return null
  const result = overrideLoader()
  if (result instanceof Promise) {
    throw new Error('setSiteClaimsIndexOverride: use sync loader or await prefetchSiteClaims')
  }
  return result
}

/** Sync read of cached / fixture claims (empty array when not yet loaded). */
export function getSiteClaimsIndexCached (): SiteClaimEntry[] {
  if (cached) return cached
  const fromOverride = resolveOverride()
  if (fromOverride) {
    cached = fromOverride
    return cached
  }
  const fromDisk = loadSiteClaimsFromFilesystem()
  if (fromDisk) {
    cached = fromDisk
    return cached
  }
  return []
}

export async function prefetchSiteClaims (
  signal?: AbortSignal
): Promise<SiteClaimEntry[] | null> {
  if (overrideLoader) {
    const result = overrideLoader()
    const claims = result instanceof Promise ? await result : result
    cached = claims ?? null
    return cached
  }

  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    if (typeof window === 'undefined') {
      const fromDisk = loadSiteClaimsFromFilesystem()
      cached = fromDisk
      return cached
    }

    await remoteRelay.bootstrap()
    const raw = await remoteRelay.fetchSiteClaimsJson(signal ?? AbortSignal.timeout(60_000))
    if (raw === null) {
      const fromDisk = loadSiteClaimsFromFilesystem()
      cached = fromDisk
      return cached
    }
    try {
      cached = parseSiteClaimsJson(raw)
      return cached
    } catch (e) {
      console.warn('[siteClaims] parse failed:', e instanceof Error ? e.message : e)
      cached = null
      return null
    }
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export async function getSiteClaimsIndex (): Promise<SiteClaimEntry[]> {
  const loaded = await prefetchSiteClaims()
  return loaded ?? getSiteClaimsIndexCached()
}

export function getSiteClaimById (id: string): SiteClaimEntry | undefined {
  return getSiteClaimsIndexCached().find((c) => c.id === id)
}
