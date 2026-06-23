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
  | 'nextdoor'

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
/** Copy-share text: keep hashtag spam low; Instagram allows many more but we cap at five for readability */
export const INSTAGRAM_HASHTAG_MAX = 5

/** Threads post text */
export const THREADS_MAX = 500

/** Truth Social share `text` query param (first composer line) — https://help.truthsocial.com/publishers/share-button/ */
export const TRUTHSOCIAL_TEXT_MAX = 500

/** Copy & Share modal: full pasted body budget when Format is Truth Social (intent URL still uses {@link TRUTHSOCIAL_TEXT_MAX}). */
export const TRUTHSOCIAL_COPY_MAX = 3000

/** LinkedIn feed post (common cap; document if Meta changes) */
export const LINKEDIN_MAX = 3000

/** Facebook status post — Meta hard limit is 63,206 (not used for Copy & Share modal). */
export const FACEBOOK_MAX = 63000

/** Copy & Share modal: paragraph body + clip CTA (same budget as Nextdoor). */
export const FACEBOOK_COPY_MAX = 8192

/** Reddit self-text / pasted caption (no single hard cap; keep reasonable) */
export const REDDIT_COPY_MAX = 40000

/** Nextdoor ShareKit `body` query param — https://developer.nextdoor.com/reference/share-plugin */
export const NEXTDOOR_SHARE_BODY_MAX = 3500

/** Nextdoor post body_text (Publish API) — max pasted caption in app */
export const NEXTDOOR_COPY_MAX = 8192

/**
 * When non-null, the Copy & Share textarea includes snippet + article up to this many characters.
 * Otherwise the modal uses a short preview (no article body).
 */
export function platformModalCopyLimit (platform: SharePlatformId): number | null {
  switch (platform) {
    case 'facebook':
      return FACEBOOK_COPY_MAX
    case 'instagram':
      return INSTAGRAM_CAPTION_MAX
    case 'truthsocial':
      return TRUTHSOCIAL_COPY_MAX
    case 'nextdoor':
      return NEXTDOOR_COPY_MAX
    default:
      return null
  }
}

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
      return FACEBOOK_COPY_MAX
    case 'nextdoor':
      return NEXTDOOR_COPY_MAX
    default:
      return FACEBOOK_MAX
  }
}

/**
 * Per-platform recommended cap on the number of `#hashtag` tokens in a copy block.
 * `null` means "no per-platform tag count cap" (still subject to overall character limits).
 *
 * Instagram: we cap copied hashtags at {@link INSTAGRAM_HASHTAG_MAX} for readable captions.
 */
export function platformHashtagLimit (platform: SharePlatformId): number | null {
  switch (platform) {
    case 'instagram':
      return INSTAGRAM_HASHTAG_MAX
    default:
      return null
  }
}

/**
 * Trim a space-separated hashtag line down to the first `max` `#tokens`, preserving order
 * and ignoring non-tag whitespace. Returns the original string if it already fits or has no cap.
 */
export function limitHashtagsLine (line: string, max: number | null): string {
  if (!line || max == null) return line
  const tokens = line.split(/\s+/).filter(Boolean)
  if (tokens.length <= max) return line
  return tokens.slice(0, max).join(' ')
}
