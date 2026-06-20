export type SiteAiReplyStarter = {
  id: string
  label: string
  enterReplyMode: boolean
  prompt: string
}

export const SITE_AI_REPLY_STARTERS: readonly SiteAiReplyStarter[] = [
  {
    id: 'social-thread',
    label: 'Help me reply to a post in a social thread',
    enterReplyMode: true,
    prompt:
      'Help me draft a reply to a post in a social thread. Ask me to paste the post (and any thread context I care about). Then search site articles, draft in Paradigm Threat voice, and iterate with me.',
  },
  {
    id: 'antisemitism-attack',
    label: 'Help me reply to an antisemitic attack',
    enterReplyMode: true,
    prompt:
      'Help me draft a reply to an antisemitic attack. Ask me to paste the exact post. When I do, use the antisemitism playbook (Ten Commandments §5 and Substack tropes Q&A) to match the attack profile, read the matched entries, and help me draft a specific grounded reply.',
  },
] as const

/** True when text is a known reply starter prompt (not pasted source). */
export function isSiteAiReplyStarterPrompt (text: string): boolean {
  const trimmed = text.trim()
  return SITE_AI_REPLY_STARTERS.some((s) => s.prompt.trim() === trimmed)
}
