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
  return nodes.map((n, i) => renderMdAstNode(n, i, opts, overrides))
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
  const reactProps: Record<string, unknown> = { ...propsFromNode(n.props || {}), ...(extraProps ?? {}), key: i }
  const kids = (n.children || []).map((c, j) => renderMdAstNode(c, j, opts, overrides))

  if (rawTag === 'a' && opts) {
    if (opts.anchorProps) Object.assign(reactProps, opts.anchorProps)
    if (opts.anchorOnClick !== undefined) {
      reactProps.onClick = opts.anchorOnClick
    }
  }

  if (typeof component === 'string') {
    return createElement(component, reactProps, ...kids)
  }

  const Comp = component
  return <Comp {...reactProps}>{kids}</Comp>
}
