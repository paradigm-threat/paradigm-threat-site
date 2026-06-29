import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSiteClaimsJson } from '@/lib/siteAi/parseSiteClaims'
import { setSiteClaimsIndexOverride } from '@/lib/siteAi/siteClaimsStore'

const FIXTURE = join(process.cwd(), '../paradigm-threat-files/site-claims.json')

export function loadSiteClaimsFixture (): ReturnType<typeof parseSiteClaimsJson> {
  const raw = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown
  return parseSiteClaimsJson(raw)
}

export function installSiteClaimsFixture (): void {
  setSiteClaimsIndexOverride(() => loadSiteClaimsFixture())
}
