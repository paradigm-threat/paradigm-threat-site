import assert from 'node:assert/strict'
import { describe, it, before, after } from 'node:test'
import { markdownToSeoHtml } from './markdownToSeoHtml.ts'

describe('markdownToSeoHtml', () => {
  const prevFiles = process.env.NEXT_PUBLIC_FILES_BASE_URL

  before(() => {
    process.env.NEXT_PUBLIC_FILES_BASE_URL =
      'https://paradigm-threat-files.iad1.relaygateway.net'
  })

  after(() => {
    if (prevFiles === undefined) delete process.env.NEXT_PUBLIC_FILES_BASE_URL
    else process.env.NEXT_PUBLIC_FILES_BASE_URL = prevFiles
  })

  it('renders headings and paragraphs', () => {
    const html = markdownToSeoHtml('# Title\n\nHello **world**.', { basePath: '' })
    assert.match(html, /<h1>Title<\/h1>/)
    assert.match(html, /<p>Hello <strong>world<\/strong>\.<\/p>/)
  })

  it('resolves relative image URLs to relay optimized mirror', () => {
    const html = markdownToSeoHtml('![alt](./img.jpg)', { basePath: 'blog' })
    assert.match(
      html,
      /src="https:\/\/paradigm-threat-files\.iad1\.relaygateway\.net\/blog\/img\.jpg\?w=800"/,
    )
  })

  it('rewrites paradigmthreat.net absolute image URLs to relay mirror', () => {
    const html = markdownToSeoHtml(
      '![x](https://paradigmthreat.net/history/chronology/napoleon-corpses-dry-egypt-siberian-disease-quote.png)',
      { basePath: 'history/chronology' },
    )
    assert.match(html, /relaygateway\.net\/history\/chronology\/napoleon-corpses/)
    assert.doesNotMatch(html, /paradigmthreat\.net/)
  })

  it('injects changelog placeholder', () => {
    const html = markdownToSeoHtml('## Log\n\n<ChangeLog />', {
      basePath: '',
      changelogHtml: '<ul><li>item</li></ul>',
    })
    assert.match(html, /<ul><li>item<\/li><\/ul>/)
    assert.doesNotMatch(html, /ChangeLog/)
  })

  it('strips unknown PascalCase components', () => {
    const html = markdownToSeoHtml('Before\n<ChatRoom />\nAfter', { basePath: '' })
    assert.match(html, /Before/)
    assert.match(html, /After/)
    assert.doesNotMatch(html, /ChatRoom/)
  })

  it('normalizes ![# heading lead blocks (cosmos/mars)', () => {
    const snippet = `![# The Deep State is on Mars

This article has been rewritten with the following updates.
Originally I said the Martian appearances in the War of the Worlds book must have been a redaction by H.G. Wells,
but now I believe that the book's text was not redacted.

<figure><iframe src="https://www.youtube.com/embed/test"></iframe></figure>`
    const html = markdownToSeoHtml(snippet, { basePath: 'cosmos/mars' })
    assert.match(html, /<h1>The Deep State is on Mars<\/h1>/)
    assert.match(html, /This article has been rewritten/)
    assert.match(html, /War of the Worlds/)
    assert.doesNotMatch(html, /!\[#/)
    assert.match(html, /<iframe/)
  })

  it('marks confirmed-dead hrefs', () => {
    const html = markdownToSeoHtml(
      'See [gone](https://Example.COM/gone#x) and [live](https://example.com/live).',
      {
        basePath: '',
        deadUrls: { 'https://example.com/gone': { reason: 'http_404', status: 404 } },
      },
    )
    assert.match(html, /class="pt-dead-link"/)
    assert.match(html, /title="http_404"/)
    assert.match(html, /\(dead\)/)
    assert.match(html, /href="https:\/\/example.com\/live"/)
    assert.doesNotMatch(html, /live<\/a> <span>\(dead\)/)
  })
})
