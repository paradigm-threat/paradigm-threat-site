import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import robots from '../app/robots.ts'

describe('robots.txt', () => {
  it('disallows API, docs, and chat from crawlers', () => {
    const rules = robots()
    assert.equal(rules.rules?.userAgent, '*')
    assert.deepEqual(rules.rules?.disallow, ['/api/', '/docs/', '/chat'])
    assert.equal(rules.rules?.allow, '/')
  })
})
