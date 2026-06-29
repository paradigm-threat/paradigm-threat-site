import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { buildSiteChatSystemPrompt } from '@/lib/siteAi/buildSiteChatSystemPrompt'
import { extractReplySourceText } from '@/lib/siteAi/extractReplySourceText'
import {
  formatQuestionContextForPrompt,
  prepareQuestionContext,
} from '@/lib/siteAi/prepareQuestionContext'
import { formatToolProgressDetail, withFetchProgressReporting } from '@/lib/siteAi/agentProgress'
import { runSiteAiAgent, type SiteAiAgentProgress } from '@/lib/siteAi/runSiteAiAgent'
import { executeSiteAiTool } from '@/lib/siteAi/siteAiToolBridge'
import {
  buildSearchChatIntent,
  formatSearchContextForPrompt,
  type SiteAiSearchContext,
  type SiteAiSearchIntent,
} from '@/lib/search/searchChatIntents'

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
  replyMode?: boolean
  submissionMode?: boolean
  searchIntent?: SiteAiSearchIntent
  searchContext?: SiteAiSearchContext | null
  signal?: AbortSignal
  onProgress?: (event: SiteAiAgentProgress) => void
}

const MAX_HISTORY_TURNS = 6

function trimHistory (history: SiteAiChatTurn[]): SiteAiChatTurn[] {
  return history.slice(-MAX_HISTORY_TURNS)
}

function buildUserMessage (input: {
  question: string
  seedContext: string
  pageContext?: SiteAiPageContext | null
  replyMode?: boolean
  submissionMode?: boolean
  replySeedContext?: string
  replySourceText?: string | null
  searchContextBlock?: string
}): string {
  const parts = [
    input.submissionMode
      ? 'Help the visitor submit an investigation idea using site tools when needed.'
      : input.replyMode
        ? 'Help the visitor draft forum replies using site tools when needed.'
        : 'Answer the visitor question using site tools when needed.',
    'When a site claim card matches, lead with its thesis then expand from read_article results.',
    'When finished, output only the answer prose.',
    '',
    'Question context seed (claims + Q&A-first index lookup):',
    input.seedContext,
  ]

  if (input.replyMode && input.replySeedContext) {
    parts.push(
      '',
      'Reply context seed (from prepare_reply_context):',
      input.replySeedContext,
    )
    if (input.replySourceText) {
      parts.push(
        '',
        '--- Post to reply to ---',
        input.replySourceText,
        '---',
      )
    }
  } else if (input.replyMode) {
    parts.push(
      '',
      'Reply mode: the visitor wants help replying in a social thread but has not pasted the target post yet (or it is too short).',
      'Ask them to paste the post they want to reply to, then draft grounded replies using site articles.',
    )
  }

  if (input.submissionMode) {
    parts.push(
      '',
      'Submission mode: help the visitor propose a new investigation topic.',
      'Gather topic, description, and optional http(s) URLs. Search the site first. Recap and get explicit confirmation before calling submit_investigation_idea.',
    )
  }

  if (input.pageContext?.path) {
    parts.push(
      '',
      'Current page context (visitor is reading this article now):',
      JSON.stringify({
        path: input.pageContext.path,
        title: input.pageContext.title,
        excerpt: input.pageContext.excerpt?.slice(0, 600),
      }, null, 2),
      'When the question refers to "this page" or asks for a summary, read_article on path first.',
    )
  }

  if (input.searchContextBlock) {
    parts.push('', input.searchContextBlock)
  }

  parts.push('', '--- Question ---', input.question.trim(), '---')
  return parts.join('\n')
}

export async function askSiteAi (input: AskSiteAiInput): Promise<string> {
  const intentBuilt = input.searchIntent
    ? buildSearchChatIntent({
      intent: input.searchIntent,
      question: input.question,
      searchContext: input.searchContext,
    })
    : null
  const question = (intentBuilt?.userMessage ?? input.question).trim()
  if (question.length < 3) {
    throw new Error('Enter a question (at least 3 characters)')
  }

  return withFetchProgressReporting(input.onProgress, async () => {
    input.onProgress?.({ phase: 'init', message: 'Starting…' })
    input.onProgress?.({ phase: 'context', message: 'Searching Q&A pages and related articles…' })

    const history = trimHistory(input.history ?? [])
    const replySourceText = input.replyMode
      ? extractReplySourceText({ question, history })
      : null
    const hasReplySource = Boolean(replySourceText && replySourceText.length >= 20)

    const ctx = await prepareQuestionContext(question, input.pageContext)
    const seedContext = formatQuestionContextForPrompt(ctx)

    let replySeedContext: string | undefined
    if (input.replyMode && hasReplySource && replySourceText) {
      const seedArgs = {
        sourceText: replySourceText,
        includeCitations: false,
        tone: 'conversational' as const,
      }
      const seedDetail = formatToolProgressDetail('prepare_reply_context', seedArgs)
      input.onProgress?.({ phase: 'context', message: seedDetail })
      input.onProgress?.({
        phase: 'tool',
        toolName: 'prepare_reply_context',
        status: 'start',
        args: seedArgs,
        detail: seedDetail,
      })
      try {
        replySeedContext = await executeSiteAiTool('prepare_reply_context', seedArgs)
      } finally {
        input.onProgress?.({
          phase: 'tool',
          toolName: 'prepare_reply_context',
          status: 'done',
          args: seedArgs,
          detail: seedDetail,
        })
      }
    }

    const historyMessages: LanguageModelMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const conversation: LanguageModelMessage[] = [
      ...historyMessages,
      {
        role: 'user',
        content: buildUserMessage({
          question,
          seedContext,
          pageContext: input.pageContext,
          replyMode: input.replyMode,
          submissionMode: input.submissionMode,
          replySeedContext,
          replySourceText,
          searchContextBlock: formatSearchContextForPrompt(input.searchContext),
        }),
      },
    ]

    const systemPrompt = buildSiteChatSystemPrompt({
      includeReplySections: Boolean(input.replyMode),
      includeSubmissionSections: Boolean(input.submissionMode),
      searchIntentOverlay: intentBuilt?.systemPromptOverlay,
    })

    const finalInstruction = input.submissionMode
      ? 'Coach the visitor through submission: search first, recap, confirm, then submit via tool. After submit, confirm success and mention /submit.'
      : input.replyMode && hasReplySource
      ? 'Write the forum reply as plain prose ready to paste (no tool markers).'
      : input.replyMode
        ? 'Coach the visitor: ask them to paste the post if missing, then offer to draft a reply.'
        : 'Write the final answer for the visitor as plain prose (no tool markers).'

    const minFinalLength = input.replyMode && hasReplySource ? 20 : 8

    const result = await runSiteAiAgent({
      systemPrompt,
      conversation,
      signal: input.signal,
      onProgress: input.onProgress,
      finalInstruction,
      minFinalLength,
      maxTurns: intentBuilt?.maxTurns,
    })

    return result.finalText
  })
}
