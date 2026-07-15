import test from 'node:test'
import assert from 'node:assert/strict'
import { transformImageCaptions } from './markdownTransform'

test('transformImageCaptions forwards JSON className from quoted title', () => {
  const md = String.raw`![alt](/influence/conspiracy/embedding.jpg?w=360 '{"className":"sm:float-right clear-both"}')`
  const out = transformImageCaptions(md)
  assert.match(out, /className="sm:float-right clear-both"/)
  assert.doesNotMatch(out, /title=/)
})

test('transformImageCaptions normalizes image-prefixed headings before scanning images', () => {
  const md = [
    '![# The Deep State is on Mars',
    '',
    'Introductory copy.',
    '',
    '![Mars evidence](/cosmos/mars/evidence.jpg)',
  ].join('\n')

  const out = transformImageCaptions(md)

  assert.match(out, /^# The Deep State is on Mars/)
  assert.match(out, /<PopImage src="\/cosmos\/mars\/evidence\.jpg" alt="Mars evidence" \/>/)
  assert.doesNotMatch(out, /<PopImage[^>]*The Deep State/)
})
