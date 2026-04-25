/**
 * Conservative copy-buffer limits for social share text.
 * X URL weight: https://docs.x.com/fundamentals/counting-characters (t.co = 23)
 */

export type SharePlatformId =
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'bluesky'
  | 'instagram'
  | 'substack'
  | 'threads'
  | 'truthsocial'

/** Max chars for Reddit submission title query param */
export const REDDIT_TITLE_MAX = 300

/** X standard post — Premium long posts ignored here */
export const X_MAX = 280
/** X counts any URL as this many chars after wrapping to t.co */
export const X_URL_WEIGHT = 23

/** Bluesky post (approximate; grapheme-accurate counting is optional follow-up) */
export const BLUESKY_MAX = 300

/** Instagram caption */
export const INSTAGRAM_CAPTION_MAX = 2200
/** Instagram recommends ≤30 hashtags per post */
export const INSTAGRAM_HASHTAG_MAX = 30

/** Threads post text */
export const THREADS_MAX = 500

/** Truth Social share `text` query param (first composer line) — https://help.truthsocial.com/publishers/share-button/ */
export const TRUTHSOCIAL_TEXT_MAX = 500

/** LinkedIn feed post (common cap; document if Meta changes) */
export const LINKEDIN_MAX = 3000

/** Facebook — very large; cap avoids runaway copy */
export const FACEBOOK_MAX = 63000

/** Reddit self-text / pasted caption (no single hard cap; keep reasonable) */
export const REDDIT_COPY_MAX = 40000

export function platformCopyLimit (platform: SharePlatformId): number {
  switch (platform) {
    case 'x':
      return X_MAX
    case 'bluesky':
      return BLUESKY_MAX
    case 'reddit':
      return REDDIT_COPY_MAX
    case 'instagram':
      return INSTAGRAM_CAPTION_MAX
    case 'substack':
      // Notes has a soft-ish limit that changes; keep generous but bounded.
      return LINKEDIN_MAX
    case 'threads':
      return THREADS_MAX
    case 'truthsocial':
      return TRUTHSOCIAL_TEXT_MAX
    case 'linkedin':
      return LINKEDIN_MAX
    case 'facebook':
      return FACEBOOK_MAX
    default:
      return FACEBOOK_MAX
  }
}
