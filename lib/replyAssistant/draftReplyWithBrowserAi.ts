import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { buildReplySystemPrompt } from '@/lib/replyAssistant/agentPrompt'
import type { SiteAiAgentProgress } from '@/lib/siteAi/agentProgress'
import { formatToolProgressDetail, withFetchProgressReporting } from '@/lib/siteAi/agentProgress'
import { runSiteAiAgent } from '@/lib/siteAi/runSiteAiAgent'
import { executeSiteAiTool } from '@/lib/siteAi/siteAiToolBridge'

export type DraftReplyInput = {
  sourceText: string
  includeCitations: boolean
  tone?: 'conversational' | 'neutral' | 'brief'
  /** Optional angle / emphasis — how the reply should be framed. */
  instructions?: string
  signal?: AbortSignal
  onProgress?: (event: SiteAiAgentProgress) => void
}

export type { SiteAiAgentProgress as DraftReplyProgress } from '@/lib/siteAi/agentProgress'

export type DraftReplyResult = {
  draft: string
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>
  turns: number
}

export async function draftReplyWithBrowserAi (input: DraftReplyInput): Promise<DraftReplyResult> {
  const sourceText = input.sourceText.trim()
  const instructions = input.instructions?.trim() || undefined
  if (sourceText.length < 20) {
    throw new Error('Paste at least 20 characters before drafting a reply')
  }

  return withFetchProgressReporting(input.onProgress, async () => {
    input.onProgress?.({ phase: 'init', message: 'Preparing reply assistant…' })

    const seedArgs = {
      sourceText,
      includeCitations: input.includeCitations,
      tone: input.tone ?? 'conversational',
      ...(instructions ? { userInstructions: instructions } : {}),
    }
    const seedDetail = formatToolProgressDetail('prepare_reply_context', seedArgs)
    input.onProgress?.({
      phase: 'context',
      message: seedDetail,
    })
    input.onProgress?.({
      phase: 'tool',
      toolName: 'prepare_reply_context',
      status: 'start',
      args: seedArgs,
      detail: seedDetail,
    })

    let seedContext: string
    try {
      seedContext = await executeSiteAiTool('prepare_reply_context', seedArgs)
    } finally {
      input.onProgress?.({
        phase: 'tool',
        toolName: 'prepare_reply_context',
        status: 'done',
        args: seedArgs,
        detail: seedDetail,
      })
    }

    const systemPrompt = buildReplySystemPrompt({
      includeCitations: input.includeCitations,
      tone: input.tone,
      instructions,
    })

    const userMessageParts = [
      'Draft a forum reply to the post below.',
      'Use tools when you need site context. When finished, output only the reply text.',
      '',
      'Index seed (from prepare_reply_context):',
      seedContext,
    ]

    if (instructions) {
      userMessageParts.push(
        '',
        '--- Reply instructions (angle / tone / emphasis) ---',
        instructions,
        '---',
      )
    }

    userMessageParts.push(
      '',
      '--- Post to reply to ---',
      sourceText,
      '---',
    )

    const conversation: LanguageModelMessage[] = [
      {
        role: 'user',
        content: userMessageParts.join('\n'),
      },
    ]

    const result = await runSiteAiAgent({
      systemPrompt,
      conversation,
      signal: input.signal,
      onProgress: input.onProgress,
      minFinalLength: 20,
      finalInstruction: 'Write the full forum reply now as plain prose (no tool markers).',
    })

    return {
      draft: result.finalText,
      toolCalls: [
        { name: 'prepare_reply_context', arguments: seedArgs },
        ...result.toolCalls,
      ],
      turns: result.turns,
    }
  })
}
