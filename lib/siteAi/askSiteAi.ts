import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { buildSiteChatSystemPrompt } from '@/lib/siteAi/buildSiteChatSystemPrompt'
import {
  formatQuestionContextForPrompt,
  prepareQuestionContext,
} from '@/lib/siteAi/prepareQuestionContext'
import { runSiteAiAgent, type SiteAiAgentProgress } from '@/lib/siteAi/runSiteAiAgent'

export type SiteAiPageContext = {
  path: string
  title: string
  excerpt?: string
}

export type SiteAiChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type AskSiteAiInput = {
  question: string
  history?: SiteAiChatTurn[]
  pageContext?: SiteAiPageContext | null
  signal?: AbortSignal
  onProgress?: (event: SiteAiAgentProgress) => void
}

const MAX_HISTORY_TURNS = 6

function trimHistory (history: SiteAiChatTurn[]): SiteAiChatTurn[] {
  return history.slice(-MAX_HISTORY_TURNS)
}

function buildUserMessage (
  question: string,
  seedContext: string,
  pageContext?: SiteAiPageContext | null
): string {
  const parts = [
    'Answer the visitor question using site tools when needed.',
    'When finished, output only the answer prose.',
    '',
    'Question context seed (Q&A-first index lookup):',
    seedContext,
  ]

  if (pageContext?.path) {
    parts.push(
      '',
      'Current page context:',
      JSON.stringify({
        path: pageContext.path,
        title: pageContext.title,
        excerpt: pageContext.excerpt?.slice(0, 600),
      }, null, 2),
    )
  }

  parts.push('', '--- Question ---', question.trim(), '---')
  return parts.join('\n')
}

export async function askSiteAi (input: AskSiteAiInput): Promise<string> {
  const question = input.question.trim()
  if (question.length < 3) {
    throw new Error('Enter a question (at least 3 characters)')
  }

  input.onProgress?.({ phase: 'init', message: 'Starting…' })
  input.onProgress?.({ phase: 'context', message: 'Searching Q&A pages and related articles…' })

  const ctx = await prepareQuestionContext(question)
  const seedContext = formatQuestionContextForPrompt(ctx)

  const historyMessages: LanguageModelMessage[] = trimHistory(input.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const conversation: LanguageModelMessage[] = [
    ...historyMessages,
    {
      role: 'user',
      content: buildUserMessage(question, seedContext, input.pageContext),
    },
  ]

  const result = await runSiteAiAgent({
    systemPrompt: buildSiteChatSystemPrompt(),
    conversation,
    signal: input.signal,
    onProgress: input.onProgress,
    finalInstruction: 'Write the final answer for the visitor as plain prose (no tool markers).',
    minFinalLength: 8,
  })

  return result.finalText
}
