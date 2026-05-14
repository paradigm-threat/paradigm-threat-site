import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extractShareMetadata } from './extractShareMetadata.ts'
import {
  composeShareText,
  fitComposeShareToCharLimit,
  truncateShareTextForOutbound,
} from './composeShareText.ts'
import {
  INSTAGRAM_CAPTION_MAX,
  INSTAGRAM_HASHTAG_MAX,
  TRUTHSOCIAL_COPY_MAX,
  limitHashtagsLine,
  platformModalCopyLimit,
} from './platformLimits.ts'

const SUBSTACK_URL = 'https://paradigmthreat2.substack.com/p/pursue-release-01-what-am-i-asking'

const SAMPLE_BODY = `# Sample Article

> **TL;DR:** A short summary line.

Body paragraph one.

Keywords: #UAP #Mars #ParadigmThreat

**Substack:** [paradigmthreat2.substack.com/p/pursue-release-01-what-am-i-asking](${SUBSTACK_URL})

**Last updated:** 2026-05-09
`

test('extractShareMetadata picks up the Substack marker line', () => {
  const r = extractShareMetadata({ rawMarkdown: SAMPLE_BODY })
  assert.equal(r.substackUrl, SUBSTACK_URL)
  assert.match(r.hashtagsLine, /#UAP/)
})

test('extractShareMetadata returns undefined when no Substack URL is present', () => {
  const r = extractShareMetadata({ rawMarkdown: '# Hi\n\nBody only.\n\nKeywords: #Tag\n' })
  assert.equal(r.substackUrl, undefined)
})

test('extractShareMetadata picks up a bare Substack /p/ URL anywhere in the body', () => {
  const md = `# Title\n\nSome paragraph mentioning ${SUBSTACK_URL} inline.\n\nKeywords: #Tag\n`
  const r = extractShareMetadata({ rawMarkdown: md })
  assert.equal(r.substackUrl, SUBSTACK_URL)
})

test('composeShareText renders the Substack URL on its own line below the canonical URL', () => {
  const text = composeShareText('facebook', {
    title: 'Sample Article',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: '',
    hashtagsLine: '#UAP #Mars',
    articleBodyPlain: '',
    substackUrl: SUBSTACK_URL,
  })
  const lines = text.split('\n')
  const canonIdx = lines.indexOf('https://paradigmthreat.net/sample')
  const subIdx = lines.indexOf(SUBSTACK_URL)
  assert.ok(canonIdx >= 0, 'canonical URL line is present')
  assert.equal(subIdx, canonIdx + 1, 'Substack URL is on the line directly after the canonical URL')
})

test('composeShareText omits the Substack line when it equals the canonical URL', () => {
  const text = composeShareText('facebook', {
    title: 'Sample Article',
    canonicalUrl: SUBSTACK_URL,
    snippetPlain: '',
    hashtagsLine: '',
    articleBodyPlain: '',
    substackUrl: SUBSTACK_URL,
  })
  const occurrences = text.split(SUBSTACK_URL).length - 1
  assert.equal(occurrences, 1, 'Substack URL appears exactly once when it is the canonical URL')
})

test('limitHashtagsLine caps token count and preserves order', () => {
  const tags = Array.from({ length: 35 }, (_, i) => `#tag${i + 1}`).join(' ')
  const capped = limitHashtagsLine(tags, INSTAGRAM_HASHTAG_MAX)
  const tokens = capped.split(/\s+/).filter(Boolean)
  assert.equal(tokens.length, INSTAGRAM_HASHTAG_MAX)
  assert.equal(tokens[0], '#tag1')
  assert.equal(tokens[INSTAGRAM_HASHTAG_MAX - 1], `#tag${INSTAGRAM_HASHTAG_MAX}`)
})

test('limitHashtagsLine returns the original line when below the cap or cap is null', () => {
  assert.equal(limitHashtagsLine('#a #b #c', 30), '#a #b #c')
  assert.equal(limitHashtagsLine('#a #b #c', null), '#a #b #c')
  assert.equal(limitHashtagsLine('', 30), '')
})

test('composeShareText caps Instagram hashtags at the platform limit', () => {
  const tags = Array.from({ length: 50 }, (_, i) => `#t${i + 1}`).join(' ')
  const text = composeShareText('instagram', {
    title: 'Sample',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: '',
    hashtagsLine: tags,
    articleBodyPlain: '',
  })
  const tagTokens = text.match(/#t\d+/g) || []
  assert.equal(tagTokens.length, INSTAGRAM_HASHTAG_MAX)
})

test('composeShareText for Instagram includes article body when within caption limit', () => {
  const article = 'First paragraph. Second paragraph with enough words to be recognizable.'
  const text = composeShareText('instagram', {
    title: 'Sample',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: 'Snippet line.',
    hashtagsLine: '#UAP',
    articleBodyPlain: article,
  })
  assert.ok(text.includes(article), 'article plain body appears in composed Instagram text')
  assert.ok(text.includes('Snippet line.'), 'snippet appears before article block')
})

test('platformModalCopyLimit enables long modal copy for Instagram and Truth Social only', () => {
  assert.equal(platformModalCopyLimit('instagram'), INSTAGRAM_CAPTION_MAX)
  assert.equal(platformModalCopyLimit('truthsocial'), TRUTHSOCIAL_COPY_MAX)
  assert.equal(platformModalCopyLimit('x'), null)
})

test('fitComposeShareToCharLimit trims oversized Truth Social modal copy to at most TRUTHSOCIAL_COPY_MAX', () => {
  const hugeArticle = 'word '.repeat(5000)
  const input = {
    title: 'Sample',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: 'Snip.',
    hashtagsLine: '#a #b',
    articleBodyPlain: hugeArticle,
  }
  const fitted = fitComposeShareToCharLimit('truthsocial', input, TRUTHSOCIAL_COPY_MAX)
  assert.ok(fitted.length <= TRUTHSOCIAL_COPY_MAX)
  assert.ok(fitted.includes('https://paradigmthreat.net/sample'))
})

test('fitComposeShareToCharLimit trims oversized Instagram copy to at most caption limit', () => {
  const hugeArticle = 'word '.repeat(4000)
  const input = {
    title: 'Sample',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: 'Snip.',
    hashtagsLine: '#a #b #c #d #e',
    articleBodyPlain: hugeArticle,
  }
  const fitted = fitComposeShareToCharLimit('instagram', input, INSTAGRAM_CAPTION_MAX)
  assert.ok(fitted.length <= INSTAGRAM_CAPTION_MAX)
  assert.ok(fitted.includes('https://paradigmthreat.net/sample'))
})

test('composeShareText leaves hashtags untouched on platforms with no per-platform tag cap', () => {
  const tags = Array.from({ length: 50 }, (_, i) => `#t${i + 1}`).join(' ')
  const text = composeShareText('linkedin', {
    title: 'Sample',
    canonicalUrl: 'https://paradigmthreat.net/sample',
    snippetPlain: '',
    hashtagsLine: tags,
    articleBodyPlain: '',
  })
  const tagTokens = text.match(/#t\d+/g) || []
  assert.equal(tagTokens.length, 50)
})

test('truncateShareTextForOutbound includes Substack URL when budget allows', () => {
  const text = truncateShareTextForOutbound('bluesky', {
    title: 'Short title',
    canonicalUrl: 'https://paradigmthreat.net/x',
    snippetPlain: '',
    hashtagsLine: '#A #B',
    articleBodyPlain: '',
    substackUrl: SUBSTACK_URL,
  })
  assert.ok(text.includes(SUBSTACK_URL), 'Substack URL fits inside Bluesky budget for short post')
})

test('truncateShareTextForOutbound drops Substack URL before sacrificing canonical URL or title', () => {
  // Pad article so X (280) trims; ensure canonical URL stays.
  const text = truncateShareTextForOutbound('x', {
    title: 'A title',
    canonicalUrl: 'https://paradigmthreat.net/x',
    snippetPlain: 'snippet '.repeat(20),
    hashtagsLine: '#A #B #C',
    articleBodyPlain: 'body content '.repeat(80),
    substackUrl: SUBSTACK_URL,
  })
  assert.ok(text.includes('https://paradigmthreat.net/x'), 'canonical URL preserved')
  assert.ok(text.includes('A title'), 'title preserved')
})
