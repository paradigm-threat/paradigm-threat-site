import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const gallerySrc = readFileSync(
  join(root, 'components/Image/ImageGalleryContext.tsx'),
  'utf8',
)

describe('ImageGalleryOverlay stacking', () => {
  it('portals fullscreen overlay to document.body (escapes #site-main-scroll z-0)', () => {
    assert.match(gallerySrc, /createPortal\(overlay,\s*document\.body\)/)
    assert.match(gallerySrc, /site-main-scroll uses z-0/)
  })
})
