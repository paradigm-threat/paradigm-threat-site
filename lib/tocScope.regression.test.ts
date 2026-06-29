import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isHeadingExcludedFromToc } from './tocScope.ts'

function mockHeading (
  opts: { className?: string; insideIgnore?: boolean } = {},
): HTMLHeadingElement {
  const ignoreParent = opts.insideIgnore
    ? { getAttribute: (name: string) => (name === 'data-toc-ignore' ? '' : null) }
    : null

  return {
    classList: {
      contains: (c: string) => (opts.className ?? '').split(/\s+/).includes(c),
    },
    closest: (selector: string) => {
      if (selector === '[data-toc-ignore]' && ignoreParent) return ignoreParent
      return null
    },
  } as unknown as HTMLHeadingElement
}

describe('tocScope', () => {
  it('excludes headings inside data-toc-ignore and no-index', () => {
    assert.equal(isHeadingExcludedFromToc(mockHeading({ insideIgnore: true })), true)
    assert.equal(isHeadingExcludedFromToc(mockHeading({ className: 'no-index' })), true)
    assert.equal(isHeadingExcludedFromToc(mockHeading()), false)
  })
})
