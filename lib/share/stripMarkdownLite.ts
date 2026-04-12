/**
 * Plain text for share snippets (lightweight; no MDX/JSX).
 */

export function stripMarkdownLite (text: string): string {
  if (!text) return ''
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}
