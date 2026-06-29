export type SiteAiSubmissionStarter = {
  id: string
  label: string
  enterSubmissionMode: boolean
  prompt: string
}

export const SITE_AI_SUBMISSION_STARTERS: readonly SiteAiSubmissionStarter[] = [
  {
    id: 'submit-investigation-idea',
    label: "I'd like to submit an idea for investigation",
    enterSubmissionMode: true,
    prompt:
      'I want to submit an idea for investigation on this site. Ask me for a clear topic title, a detailed description of what should be investigated and why, and any reference URLs (links only). Search the site first to see if we already cover it. When you have enough detail, recap everything and ask me to confirm before you submit it.',
  },
] as const

export function isSiteAiSubmissionStarterPrompt (text: string): boolean {
  const trimmed = text.trim()
  return SITE_AI_SUBMISSION_STARTERS.some((s) => s.prompt.trim() === trimmed)
}
