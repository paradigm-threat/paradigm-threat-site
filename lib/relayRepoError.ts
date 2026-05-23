/** Relay gateway 200 responses when a repo file is missing (often requested as `.md`). */
export function isRelayRepoNotFoundJson (text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const o = JSON.parse(trimmed) as { ok?: unknown; status?: unknown }
    return o.ok === false && o.status === 'not_found'
  } catch {
    return false
  }
}
