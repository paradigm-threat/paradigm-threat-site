import test from 'node:test'
import assert from 'node:assert/strict'
import { transformImageCaptions } from './markdownTransform'

test('transformImageCaptions forwards JSON className from quoted title', () => {
  const md = String.raw`![alt](/influence/conspiracy/embedding.jpg?w=360 '{"className":"sm:float-right clear-both"}')`
  const out = transformImageCaptions(md)
  assert.match(out, /className="sm:float-right clear-both"/)
  assert.doesNotMatch(out, /title=/)
})
