import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildIllustrationPrompt,
  parseMarkdownIllustrationMeta,
  prepareIllustrationFromMarkdown,
} from './prepareIllustrationPrompt.ts'

describe('prepareIllustrationPrompt', () => {
  it('parses title subtitle and image-gen block', () => {
    const md = `# CERN portal
Buried ring thesis

<!-- image-gen:hero
prompt: underground collider ring
model: final
-->

## Body
`
    const meta = parseMarkdownIllustrationMeta(md)
    assert.equal(meta.title, 'CERN portal')
    assert.equal(meta.subtitle, 'Buried ring thesis')
    assert.equal(meta.blocks[0]?.prompt, 'underground collider ring')
  })

  it('prepare returns CLI commands without calling HF', () => {
    const r = prepareIllustrationFromMarkdown({
      articlePath: 'science/cern_portal/foo.md',
      markdown: '# Title\nSubtitle\n',
      outputExists: false,
    })
    assert.match(r.prompt, /Title/)
    assert.match(r.cliCommand, /--dry-run/)
    assert.match(r.cliCommandGenerate, /generate-illustration\.py/)
    assert.equal(r.outputWouldOverwrite, false)
  })
})

describe('buildIllustrationPrompt', () => {
  it('includes extra prompt fragment', () => {
    const p = buildIllustrationPrompt('# A\nB\n', { extraPrompt: 'mars horizon' })
    assert.match(p, /mars horizon/)
  })
})
