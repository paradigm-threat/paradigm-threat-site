/** How widely this conclusion appears outside paradigm-threat.net. */
export type SiteClaimUniqueness =
  | 'site-distinctive'
  | 'broader-tradition'
  | 'site-position'

/** Epistemic tier — how the site presents the claim. */
export type SiteClaimConfidence =
  | 'project-thesis'
  | 'documented'
  | 'speculative'
  | 'author-thesis'
  | 'methodology'

/** Curated thesis the agent may lead with (vs documented/speculative). */
export function isSiteThesisConfidence (confidence: SiteClaimConfidence): boolean {
  return confidence === 'project-thesis' || confidence === 'author-thesis'
}

export type SiteClaimEntry = {
  id: string
  /** Short label for UI / logs */
  title: string
  /** One-paragraph site conclusion the agent should lead with */
  claim: string
  /** Optional opening sentence for chat answers */
  answerOpener?: string
  bullets?: string[]
  confidence: SiteClaimConfidence
  uniqueness: SiteClaimUniqueness
  /** Why we mark it distinctive or shared */
  uniquenessNote?: string
  topics: string[]
  demoQuestions?: string[]
  searchQueries: string[]
  /** Index prefixes to browse when seeding context */
  searchPrefixes?: string[]
  canonicalPaths: string[]
  relatedClaimIds?: string[]
  doNotSay?: string[]
}

export type MatchedSiteClaim = SiteClaimEntry & {
  matchScore: number
  matchedVia: ('demo' | 'topic' | 'query')[]
}
