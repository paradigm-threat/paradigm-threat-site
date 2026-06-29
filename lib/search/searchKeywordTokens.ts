import { REPLY_STOPWORDS } from '@/lib/replyAssistant/stopwords'
import type { IndexedPathEntry } from '@/components/helpers/indexHelper'

const FILE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif',
  'md', 'mdx', 'pdf', 'html', 'htm', 'json', 'xml', 'yaml', 'yml',
  'mp4', 'webm', 'mov', 'mp3', 'wav', 'zip', 'tar', 'gz',
])

/** Repo path segments that are not useful as related-search chips. */
const REPO_PATH_SEGMENT_NOISE = new Set([
  'events', 'cosmos', 'governance', 'blog', 'docs', 'book', 'influence',
  'debunk', 'science', 'history', 'timeline', 'false', 'flag', 'investigations',
  'investigation', 'pages', 'page', 'index', 'images', 'img', 'media', 'files',
  'auto', 'keywords', 'keyword',
])

const MARKDOWN_LABEL_NOISE = new Set([
  'tldr', 'tl', 'dr', 'figure', 'figcaption', 'caption', 'blockquote',
])

function normalizeKeywordToken (raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[*_`]+|[*_`]+$/g, '')
    .replace(/^[;:,.!?#]+|[;:,.!?#]+$/g, '')
    .trim()
}

export function isNoiseSearchKeyword (token: string): boolean {
  const t = normalizeKeywordToken(token)
  if (t.length < 3) return true
  if (REPLY_STOPWORDS.has(t)) return true
  if (FILE_EXTENSIONS.has(t)) return true
  if (REPO_PATH_SEGMENT_NOISE.has(t)) return true
  if (MARKDOWN_LABEL_NOISE.has(t)) return true
  if (/^tl;?dr:?$/i.test(t) || t.includes('tl;dr')) return true
  if (/^\d+$/.test(t)) return true
  if (!/[a-z]/.test(t)) return true
  return false
}

/** Only markdown articles contribute related-keyword chips (not images or folder nodes). */
export function isKeywordExpansionSource (path: string): boolean {
  return /\.mdx?$/i.test(path)
}

/** Title, keywords, and snippet — omit repo path segments like events/ or .jpg stems. */
export function searchableTextWithoutPath (entry: IndexedPathEntry): string {
  const normPath = entry.path.replace(/\\/g, '/')
  let text = entry.searchText
  if (text.toLowerCase().startsWith(normPath.toLowerCase())) {
    text = text.slice(normPath.length).trim()
  }
  return text
}

export function tokenizeForKeywordExpansion (text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s/._:;#\-—–]+/)
    .map((t) => normalizeKeywordToken(t))
    .filter((t) => t.length >= 3 && !isNoiseSearchKeyword(t))
}
