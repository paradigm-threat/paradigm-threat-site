import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('Vercel Speed Insights wiring', () => {
  it('depends on @vercel/speed-insights 2.x', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const spec = pkg.dependencies['@vercel/speed-insights'] || ''
    assert.match(spec, /\^?2(\.|$)/)
  })

  it('uses the Next.js Speed Insights and Analytics entrypoints', () => {
    const src = readFileSync(join(root, 'components/VercelTelemetry.tsx'), 'utf8')
    assert.match(src, /from '@vercel\/speed-insights\/next'/)
    assert.match(src, /from '@vercel\/analytics\/next'/)
    assert.doesNotMatch(src, /speed-insights\/react/)
    assert.doesNotMatch(src, /analytics\/react/)
  })

  it('mounts VercelTelemetry from the root layout', () => {
    const layout = readFileSync(join(root, 'app/layout.tsx'), 'utf8')
    assert.match(layout, /<VercelTelemetry\s*\/>/)
    assert.doesNotMatch(layout, /speed-insights\/react/)
    assert.doesNotMatch(layout, /from '@vercel\/speed-insights\/react'/)
  })

  it('does not CDN-cache /_vercel telemetry paths', () => {
    const src = readFileSync(join(root, 'lib/middlewareDocumentCache.ts'), 'utf8')
    assert.match(src, /'\/_vercel\/'/)
  })
})
