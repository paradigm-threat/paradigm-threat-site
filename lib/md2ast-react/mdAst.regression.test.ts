import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeMdAstNode, type MdNode } from './mdAst.tsx'

function elementChildren (node: MdNode): MdNode[] {
  assert.equal(node.type, 'element')
  return node.children
}

describe('normalizeMdAstNode', () => {
  it('wraps direct tr children of table in tbody', () => {
    const table: MdNode = {
      type: 'element',
      tag: 'table',
      props: {},
      children: [
        {
          type: 'element',
          tag: 'tr',
          props: {},
          children: [{ type: 'element', tag: 'td', props: {}, children: [{ type: 'text', content: 'a' }] }],
        },
      ],
    }
    const out = normalizeMdAstNode(table)
    assert.equal(out.type, 'element')
    assert.equal(out.tag, 'table')
    const sections = elementChildren(out)
    assert.equal(sections.length, 1)
    assert.equal(sections[0]!.type, 'element')
    assert.equal((sections[0] as { tag: string }).tag, 'tbody')
  })

  it('wraps direct td children of thead in tr', () => {
    const table: MdNode = {
      type: 'element',
      tag: 'table',
      props: {},
      children: [
        {
          type: 'element',
          tag: 'thead',
          props: {},
          children: [
            { type: 'element', tag: 'td', props: {}, children: [{ type: 'text', content: 'h1' }] },
            { type: 'element', tag: 'td', props: {}, children: [{ type: 'text', content: 'h2' }] },
          ],
        },
      ],
    }
    const out = normalizeMdAstNode(table)
    const thead = elementChildren(out)[0]!
    assert.equal((thead as { tag: string }).tag, 'thead')
    const rows = elementChildren(thead)
    assert.equal(rows.length, 1)
    assert.equal((rows[0] as { tag: string }).tag, 'tr')
    assert.equal(elementChildren(rows[0]!).length, 2)
  })
})
