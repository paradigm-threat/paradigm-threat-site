import type {
  SiteClaimConfidence,
  SiteClaimEntry,
  SiteClaimUniqueness,
} from '@/lib/siteAi/siteClaimsTypes'

const CONFIDENCE: SiteClaimConfidence[] = [
  'project-thesis',
  'documented',
  'speculative',
  'author-thesis',
  'methodology',
]
const UNIQUENESS: SiteClaimUniqueness[] = [
  'site-distinctive',
  'broader-tradition',
  'site-position',
]

function isStringArray (v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function parseClaimEntry (raw: unknown, index: number): SiteClaimEntry {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`site-claims[${index}]: expected object`)
  }
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const claim = typeof o.claim === 'string' ? o.claim.trim() : ''
  if (!id || !title || !claim) {
    throw new Error(`site-claims[${index}]: id, title, and claim are required`)
  }
  const confidence = o.confidence
  const uniqueness = o.uniqueness
  if (!CONFIDENCE.includes(confidence as SiteClaimConfidence)) {
    throw new Error(`site-claims[${index}] (${id}): invalid confidence`)
  }
  if (!UNIQUENESS.includes(uniqueness as SiteClaimUniqueness)) {
    throw new Error(`site-claims[${index}] (${id}): invalid uniqueness`)
  }
  if (!isStringArray(o.topics) || o.topics.length === 0) {
    throw new Error(`site-claims[${index}] (${id}): topics must be a non-empty string array`)
  }
  if (!isStringArray(o.searchQueries)) {
    throw new Error(`site-claims[${index}] (${id}): searchQueries must be a string array`)
  }
  if (!isStringArray(o.canonicalPaths) || o.canonicalPaths.length === 0) {
    throw new Error(`site-claims[${index}] (${id}): canonicalPaths must be a non-empty string array`)
  }

  const entry: SiteClaimEntry = {
    id,
    title,
    claim,
    confidence: confidence as SiteClaimConfidence,
    uniqueness: uniqueness as SiteClaimUniqueness,
    topics: o.topics,
    searchQueries: o.searchQueries,
    canonicalPaths: o.canonicalPaths,
  }

  if (typeof o.answerOpener === 'string' && o.answerOpener.trim()) {
    entry.answerOpener = o.answerOpener.trim()
  }
  if (isStringArray(o.bullets) && o.bullets.length > 0) entry.bullets = o.bullets
  if (typeof o.uniquenessNote === 'string' && o.uniquenessNote.trim()) {
    entry.uniquenessNote = o.uniquenessNote.trim()
  }
  if (isStringArray(o.demoQuestions)) entry.demoQuestions = o.demoQuestions
  if (isStringArray(o.searchPrefixes)) entry.searchPrefixes = o.searchPrefixes
  if (isStringArray(o.relatedClaimIds)) entry.relatedClaimIds = o.relatedClaimIds
  if (isStringArray(o.doNotSay)) entry.doNotSay = o.doNotSay

  return entry
}

/** Parse site-claims.json payload from paradigm-threat-files. */
export function parseSiteClaimsJson (data: unknown): SiteClaimEntry[] {
  if (!Array.isArray(data)) {
    throw new Error('site-claims.json must be a JSON array')
  }
  const claims = data.map((item, i) => parseClaimEntry(item, i))
  const ids = new Set<string>()
  for (const c of claims) {
    if (ids.has(c.id)) throw new Error(`duplicate site claim id: ${c.id}`)
    ids.add(c.id)
  }
  return claims
}
