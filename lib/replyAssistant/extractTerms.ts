import { REPLY_STOPWORDS } from '@/lib/replyAssistant/stopwords'

const MIN_TERM_LEN = 3
const MAX_TERMS = 16

function stripUrlsAndHandles (text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/gi, ' ')
    .replace(/@[A-Za-z0-9_]+/g, ' ')
    .replace(/[^\w\s'-]/g, ' ')
}

/**
 * Distinctive terms from pasted prose for OR-ranked index lookup.
 */
export function extractTermsFromText (sourceText: string): string[] {
  const cleaned = stripUrlsAndHandles(sourceText.toLowerCase())
  const raw = cleaned.split(/\s+/).map((t) => t.trim()).filter(Boolean)
  const freq = new Map<string, number>()

  for (const token of raw) {
    if (token.length < MIN_TERM_LEN) continue
    if (REPLY_STOPWORDS.has(token)) continue
    if (/^\d+$/.test(token)) continue
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }

  const ranked = Array.from(freq.entries())
    .sort((a, b) => {
      const scoreA = a[1] * (1 + a[0].length * 0.05)
      const scoreB = b[1] * (1 + b[0].length * 0.05)
      return scoreB - scoreA
    })
    .map(([t]) => t)

  return ranked.slice(0, MAX_TERMS)
}

/** Focused AND query strings derived from top terms (for merge/dedupe). */
export function extractedSearchQueries (terms: string[]): string[] {
  const out: string[] = []
  const push = (q: string) => {
    const t = q.trim()
    if (t.length >= 4 && !out.includes(t)) out.push(t)
  }

  if (terms.length >= 2) push(`${terms[0]} ${terms[1]}`)
  if (terms.length >= 3) push(`${terms[0]} ${terms[2]}`)
  for (const t of terms.slice(0, 5)) push(t)
  return out
}
