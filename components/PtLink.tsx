import Link from 'next/link'
import type { ComponentProps } from 'react'

type PtLinkProps = ComponentProps<typeof Link>

/**
 * Internal navigation link with prefetch disabled by default.
 * Reduces uncached /[[...slug]] edge requests from search hubs and article link lists.
 */
export function PtLink ({ prefetch = false, ...props }: PtLinkProps) {
  return <Link prefetch={prefetch} {...props} />
}
