/** Parse `{"className":"…"}` from image title/alt strings (paradigm-threat-files convention). */
export function parseImageJsonProps (raw: string | undefined | null): Record<string, string> {
  if (typeof raw !== 'string') return {}
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {}
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') out[k] = v
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
    }
    return out
  } catch {
    return {}
  }
}

export function imageJsonPropsToAttrs (meta: Record<string, string>): string {
  const parts: string[] = []
  if (meta.className) {
    parts.push(`className="${meta.className.replace(/"/g, '&quot;')}"`)
  }
  if (meta.id) {
    parts.push(`id="${meta.id.replace(/"/g, '&quot;')}"`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}
