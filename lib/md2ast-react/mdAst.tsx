import { createElement, type AnchorHTMLAttributes, type ComponentType, type MouseEventHandler, type ReactNode } from 'react'

export type MdNode =
  | { type: 'text'; content: string }
  | { type: 'element'; tag: string; props: Record<string, unknown>; children: MdNode[] }

export type MdOverride =
  | string
  | ComponentType<Record<string, unknown>>
  | { component: string | ComponentType<Record<string, unknown>>; props?: Record<string, unknown> }

export type MdOverrides = Record<string, MdOverride>

export interface RenderMdAstOpts {
  overrides?: MdOverrides
  anchorProps?: AnchorHTMLAttributes<HTMLAnchorElement>
  anchorOnClick?: MouseEventHandler<HTMLAnchorElement>
}

const TABLE_SECTION_TAGS = new Set(['thead', 'tbody', 'tfoot'])
const TABLE_CELL_TAGS = new Set(['td', 'th'])

function isElement (n: MdNode): n is Extract<MdNode, { type: 'element' }> {
  return n.type === 'element'
}

function el (tag: string, children: MdNode[], props: Record<string, unknown> = {}): MdNode {
  return { type: 'element', tag, props, children }
}

function normalizeTrChildren (children: MdNode[]): MdNode[] {
  return children.map(normalizeMdAstNode)
}

function normalizeRowGroupChildren (children: MdNode[]): MdNode[] {
  const normalized = children.map(normalizeMdAstNode)
  const hasDirectCells = normalized.some((c) => isElement(c) && TABLE_CELL_TAGS.has(c.tag))
  if (!hasDirectCells) {
    return normalized.map((c) => {
      if (isElement(c) && c.tag === 'tr') {
        return { ...c, children: normalizeTrChildren(c.children || []) }
      }
      return c
    })
  }

  const rows: MdNode[] = []
  let currentCells: MdNode[] = []

  const flushCells = () => {
    if (currentCells.length === 0) return
    rows.push(el('tr', currentCells))
    currentCells = []
  }

  for (const child of normalized) {
    if (isElement(child) && TABLE_CELL_TAGS.has(child.tag)) {
      currentCells.push(child)
      continue
    }
    if (isElement(child) && child.tag === 'tr') {
      flushCells()
      rows.push({ ...child, children: normalizeTrChildren(child.children || []) })
      continue
    }
    flushCells()
    rows.push(child)
  }
  flushCells()
  return rows
}

function normalizeTableChildren (children: MdNode[]): MdNode[] {
  const normalized = children.map(normalizeMdAstNode)
  const out: MdNode[] = []
  let pendingRows: MdNode[] = []
  let pendingCells: MdNode[] = []

  const flushRows = (sectionTag: 'tbody' | 'thead' | 'tfoot' = 'tbody') => {
    if (pendingCells.length > 0) {
      pendingRows.push(el('tr', pendingCells))
      pendingCells = []
    }
    if (pendingRows.length > 0) {
      out.push(el(sectionTag, pendingRows))
      pendingRows = []
    }
  }

  for (const child of normalized) {
    if (!isElement(child)) {
      flushRows()
      out.push(child)
      continue
    }
    if (TABLE_SECTION_TAGS.has(child.tag)) {
      flushRows()
      out.push({
        ...child,
        children: normalizeRowGroupChildren(child.children || []),
      })
      continue
    }
    if (child.tag === 'tr') {
      pendingRows.push({ ...child, children: normalizeTrChildren(child.children || []) })
      continue
    }
    if (TABLE_CELL_TAGS.has(child.tag)) {
      pendingCells.push(child)
      continue
    }
    flushRows()
    out.push(child)
  }
  flushRows()
  return out
}

/** Fix wasm table AST shapes that break HTML hydration (e.g. td directly under thead). */
export function normalizeMdAstNode (n: MdNode): MdNode {
  if (n.type === 'text') return n

  let children = (n.children || []).map(normalizeMdAstNode)

  if (n.tag === 'table') {
    children = normalizeTableChildren(children)
  } else if (n.tag === 'thead' || n.tag === 'tbody' || n.tag === 'tfoot') {
    children = normalizeRowGroupChildren(children)
  } else if (n.tag === 'tr') {
    children = normalizeTrChildren(children)
  }

  return { ...n, children }
}

function resolveOverride (
  overrides: MdOverrides,
  tag: string,
): { component: string | ComponentType<Record<string, unknown>>; extraProps?: Record<string, unknown> } {
  const override = overrides[tag]
  if (!override) return { component: tag }
  if (typeof override === 'string') return { component: override }
  if (typeof override === 'function') return { component: override }
  return { component: override.component, extraProps: override.props }
}

function propsFromNode (props: Record<string, unknown>): Record<string, unknown> {
  const reactProps: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className' && typeof v === 'string') reactProps.className = v
    else if (k === 'href' && typeof v === 'string') reactProps.href = v
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') reactProps[k] = v
  }
  return reactProps
}

export function renderMdAst (
  nodes: MdNode[],
  opts?: RenderMdAstOpts,
): ReactNode[] {
  const overrides = opts?.overrides ?? {}
  return nodes.map((n, i) => renderMdAstNode(normalizeMdAstNode(n), i, opts, overrides))
}

export function renderMdAstNode (
  n: MdNode,
  i: number,
  opts: RenderMdAstOpts | undefined,
  overrides: MdOverrides,
): ReactNode {
  if (n.type === 'text') {
    return n.content
  }

  const rawTag = n.tag || 'div'
  const { component, extraProps } = resolveOverride(overrides, rawTag)
  const reactProps: Record<string, unknown> = { ...propsFromNode(n.props || {}), ...(extraProps ?? {}) }
  const kids = (n.children || []).map((c, j) => renderMdAstNode(c, j, opts, overrides))

  if (rawTag === 'a' && opts) {
    if (opts.anchorProps) Object.assign(reactProps, opts.anchorProps)
    if (opts.anchorOnClick !== undefined) {
      reactProps.onClick = opts.anchorOnClick
    }
  }

  if (typeof component === 'string') {
    return createElement(component, { ...reactProps, key: i }, ...kids)
  }

  const Comp = component
  return <Comp key={i} {...reactProps}>{kids}</Comp>
}
