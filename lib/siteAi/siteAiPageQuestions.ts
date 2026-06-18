import type { SiteAiPageContext } from '@/lib/siteAi/askSiteAi'

/** Quick-ask chips shown when the visitor is on an article page. */
export function getPageContextQuestions (_title?: string): readonly string[] {
  return [
    'Summarize this page for me.',
    'What is the main thesis of this article?',
    'How does this topic connect to the rest of the site?',
  ] as const
}

export function buildSummarizePageQuestion (ctx: Pick<SiteAiPageContext, 'title' | 'path'>): string {
  return `Summarize this page for me: "${ctx.title}" (${ctx.path}).`
}

const PAGE_FOCUSED_RE =
  /\b(summarize|summary|this page|this article|current page|main thesis|what is this about|explain this page|tl;dr|tldr)\b/i

export function isPageFocusedQuestion (question: string): boolean {
  return PAGE_FOCUSED_RE.test(question.trim())
}
