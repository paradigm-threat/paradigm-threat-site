import { redirect } from 'next/navigation'

function meshChannel (raw: string): string {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9_\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  if (!s || s === 'general') return 'pt-general'
  if (s.startsWith('pt-')) return s
  return `pt-${s}`
}

/** Legacy /chat/:channel → park ChatApp with ?c=pt-<topic> */
export default async function ChatChannelPage ({
  params,
}: {
  params: Promise<{ channel?: string }>
}) {
  const p = await params
  const channel = meshChannel(p?.channel || 'general')
  redirect(`https://paradigmthreat.net/chat?c=${encodeURIComponent(channel)}`)
}
