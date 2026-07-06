import type { IndexedPathEntry } from '@/components/helpers/indexHelper'
import { REPLY_STOPWORDS } from '@/lib/replyAssistant/stopwords'
import { searchEntryTitle } from '@/lib/searchEntryDisplay'
import { searchTermMatchesHaystack } from '@/lib/searchIndexFilter'

/** Query tokens used for matching/scoring (drops filler words when the query has substance). */
export function meaningfulQueryTerms (query: string): string[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const meaningful = terms.filter((t) => !REPLY_STOPWORDS.has(t) && t.length >= 2)
  return meaningful.length > 0 ? meaningful : terms
}

export function normalizePhraseForMatch (query: string): string {
  return meaningfulQueryTerms(query).join(' ').trim()
}

function slugify (s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function pathBasename (path: string): string {
  return path.split('/').pop()?.replace(/\.(md|mdx)$/i, '') ?? path
}

function stripLeadingThe (s: string): string {
  return s.replace(/^the\s+/, '').trim()
}

/**
 * Relevance score for keyword search: term overlap + strong boosts when the query matches title or filename.
 */
export function scoreSearchEntry (entry: IndexedPathEntry, query: string): number {
  const clean = query.trim().toLowerCase()
  if (clean.length < 2) return 0

  const terms = meaningfulQueryTerms(clean)
  const haystack = entry.searchText.toLowerCase()
  const title = searchEntryTitle(entry).toLowerCase()
  const slug = pathBasename(entry.path).toLowerCase()
  const slugWords = slug.replace(/[-_]+/g, ' ')

  let score = 0
  for (const term of terms) {
    if (searchTermMatchesHaystack(term, haystack)) {
      score += 1 + Math.min(term.length, 12) * 0.05
    }
  }

  const phrase = normalizePhraseForMatch(clean)
  if (phrase.length >= 3) {
    const phraseCore = stripLeadingThe(phrase)
    const titleCore = stripLeadingThe(title)
    if (titleCore === phraseCore || title === phrase) {
      score += 50
    } else if (title.includes(phrase) || titleCore.includes(phraseCore)) {
      score += 24
    }
  }

  const querySlug = slugify(phrase || clean)
  const entrySlug = slugify(slug)
  if (querySlug.length >= 4) {
    if (entrySlug === querySlug) {
      score += 42
    } else if (entrySlug.includes(querySlug) || querySlug.includes(entrySlug)) {
      score += 22
    } else if (terms.length > 0) {
      let qi = 0
      for (const w of slugWords.split(/\s+/).filter(Boolean)) {
        if (qi >= terms.length) break
        const t = terms[qi]!
        if (w.includes(t) || t.includes(w)) qi++
      }
      if (qi === terms.length) score += 14
    }
  }

  if (terms.length > 0 && terms.every((t) => title.includes(t))) {
    score += 6 + terms.length * 2
  }

  if (/\bindex[-_]|[-_]index\.|\/page\.md$/i.test(entry.path) && !/\bindex\b/i.test(clean)) {
    score -= 5
  }
  if (/forum-reply|auto\.md/i.test(entry.path) && !/forum|reply/i.test(clean)) {
    score -= 4
  }

  return score
}

export function rankSearchEntries (
  entries: IndexedPathEntry[],
  query: string,
): IndexedPathEntry[] {
  return [...entries].sort((a, b) => {
    const sa = scoreSearchEntry(a, query)
    const sb = scoreSearchEntry(b, query)
    if (sb !== sa) return sb - sa
    return a.path.localeCompare(b.path)
  })
}
