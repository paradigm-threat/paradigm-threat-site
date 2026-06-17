export type CitationItem = {
  title: string
  url: string
}

export type CitationStyle = 'inline' | 'footer' | 'markdown'

export function formatCitationBlock (
  items: CitationItem[],
  style: CitationStyle = 'footer'
): string {
  if (!items.length) return ''
  const unique = items.filter((c, i, arr) =>
    arr.findIndex((x) => x.url === c.url) === i
  )

  if (style === 'markdown') {
    return unique.map((c) => `- [${c.title}](${c.url})`).join('\n')
  }

  if (style === 'inline') {
    return unique.map((c) => `(${c.title}: ${c.url})`).join(' ')
  }

  const lines = unique.map((c) => `• ${c.title} — ${c.url}`)
  return ['---', 'Sources:', ...lines].join('\n')
}
