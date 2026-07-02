/** URL pathname → repo-relative path segments (SPA shell; no Next catch-all params). */

export function pathSegmentsFromPathname (pathname: string | null | undefined): string[] {
  if (!pathname || pathname === '/') return []
  return pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
}

export function repoPathFromPathname (pathname: string | null | undefined): string {
  return pathSegmentsFromPathname(pathname).join('/')
}
