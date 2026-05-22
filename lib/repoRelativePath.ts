/**
 * Join article `basePath` with a markdown asset path without duplicating directory segments.
 */

export function joinRepoRelativePath (
  basePath: string | undefined,
  pathPart: string,
): string {
  const [rawPath, ...queryRest] = pathPart.split('?')
  const query = queryRest.length ? `?${queryRest.join('?')}` : ''

  if (!rawPath) return query

  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return pathPart
  }

  if (rawPath.startsWith('/')) {
    if (basePath?.startsWith('http')) {
      try {
        const origin = new URL(basePath.endsWith('/') ? basePath : `${basePath}/`).origin
        return `${origin}${rawPath}${query}`
      } catch {
        return `${rawPath}${query}`
      }
    }
    return `${rawPath}${query}`
  }

  const path = rawPath.startsWith('./') ? rawPath.slice(2) : rawPath

  if (basePath?.startsWith('http')) {
    try {
      const baseUrl = new URL(basePath.endsWith('/') ? basePath : `${basePath}/`)
      const baseDir = baseUrl.pathname.replace(/\/$/, '') || ''
      const normPath = path.replace(/^\/+/, '')
      const baseKey = baseDir.replace(/^\//, '')
      const fullPath =
        baseKey && (normPath === baseKey || normPath.startsWith(`${baseKey}/`))
          ? `/${normPath}`
          : `${baseDir}/${normPath}`.replace(/\/+/g, '/')
      const pathname = fullPath.startsWith('/') ? fullPath : `/${fullPath}`
      return `${baseUrl.origin}${pathname}${query}`
    } catch {
      const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`
      return `${prefix}${path}${query}`
    }
  }

  const normBase = (basePath || '').replace(/^\/+|\/+$/g, '')
  const normPath = path.replace(/^\/+/, '')

  if (normBase && (normPath === normBase || normPath.startsWith(`${normBase}/`))) {
    return `/${normPath}${query}`
  }

  const prefix = basePath ? (basePath.endsWith('/') ? basePath : `${basePath}/`) : ''
  const combined = `${prefix}${path}`.replace(/\/+/g, '/').replace(/^\/+/, '')
  return `/${combined}${query}`
}
