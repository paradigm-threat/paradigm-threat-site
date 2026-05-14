import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { stripYamlFrontmatter } from '@/lib/stripYamlFrontmatter'
import { markdownToSeoHtml } from '@/lib/seo/markdownToSeoHtml'

describe('mars page SEO html', () => {
  it('renders full article body including headings after figure', () => {
    const raw = readFileSync('/home/ari/dev/pt/paradigm-threat-files/cosmos/mars/page.md', 'utf8')
    const content = stripYamlFrontmatter(raw)
    const html = markdownToSeoHtml(content, { basePath: 'cosmos/mars' })
    assert.match(html, /<h1>The Deep State is on Mars<\/h1>/)
    assert.match(html, /<iframe/)
    assert.match(html, /What is the Deep State/)
    assert.match(html, /massacre\.jpg/)
    assert.ok((html.match(/<h2/g) || []).length >= 3, `expected multiple h2, got ${html.length} chars`)
  })
})
