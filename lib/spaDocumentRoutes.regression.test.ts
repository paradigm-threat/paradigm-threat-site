import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pathSegmentsFromPathname, repoPathFromPathname } from './pathFromPathname.ts'
import { shouldSpaRewriteToRoot, SPA_REWRITE_SOURCE } from './spaDocumentRoutes.ts'

describe('pathFromPathname', () => {
  it('maps pathname to repo path segments', () => {
    assert.deepEqual(pathSegmentsFromPathname('/'), [])
    assert.deepEqual(pathSegmentsFromPathname('/blog/foo'), ['blog', 'foo'])
    assert.equal(
      repoPathFromPathname('/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'),
      'events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation',
    )
  })
})

describe('spaDocumentRoutes', () => {
  it('rewrites article paths only', () => {
    assert.equal(shouldSpaRewriteToRoot('/'), false)
    assert.equal(shouldSpaRewriteToRoot('/governance/constitution/foo'), true)
    assert.equal(shouldSpaRewriteToRoot('/timeline'), false)
    assert.equal(shouldSpaRewriteToRoot('/timeline/evt-x'), false)
    assert.equal(shouldSpaRewriteToRoot('/search'), false)
    assert.equal(shouldSpaRewriteToRoot('/chat'), false)
    assert.equal(shouldSpaRewriteToRoot('/api/foo'), false)
    assert.equal(shouldSpaRewriteToRoot('/_vercel/speed-insights/vitals'), false)
    assert.equal(shouldSpaRewriteToRoot('/sw.js'), false)
  })

  it('exports rewrite source pattern', () => {
    assert.match(SPA_REWRITE_SOURCE, /^\/\(\(\?!/)
    assert.match(SPA_REWRITE_SOURCE, /_vercel\//)
  })
})
