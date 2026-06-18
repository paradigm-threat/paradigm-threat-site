import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { buildReplySystemPrompt } from '@/lib/replyAssistant/agentPrompt'
import { runSiteAiAgent } from '@/lib/siteAi/runSiteAiAgent'
import { executeSiteAiTool } from '@/lib/siteAi/siteAiToolBridge'

export type DraftReplyInput = {
  sourceText: string
  includeCitations: boolean
  tone?: 'conversational' | 'neutral' | 'brief'
  signal?: AbortSignal
  onProgress?: (event: DraftReplyProgress) => void
}

export type DraftReplyProgress =
  | { phase: 'starting' }
  | { phase: 'tool'; toolName: string }
  | { phase: 'drafting' }

export type DraftReplyResult = {
  draft: string
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>
  turns: number
}

export async function draftReplyWithBrowserAi (input: DraftReplyInput): Promise<DraftReplyResult> {
  const sourceText = input.sourceText.trim()
  if (sourceText.length < 20) {
    throw new Error('Paste at least 20 characters before drafting a reply')
  }

  input.onProgress?.({ phase: 'starting' })
  input.onProgress?.({ phase: 'tool', toolName: 'prepare_reply_context' })

  const seedContext = await executeSiteAiTool('prepare_reply_context', {
    sourceText,
    includeCitations: input.includeCitations,
    tone: input.tone ?? 'conversational',
  })

  const systemPrompt = buildReplySystemPrompt({
    includeCitations: input.includeCitations,
    tone: input.tone,
  })

  const conversation: LanguageModelMessage[] = [
    {
      role: 'user',
      content: [
        'Draft a forum reply to the post below.',
        'Use tools when you need site context. When finished, output only the reply text.',
        '',
        'Index seed (from prepare_reply_context):',
        seedContext,
        '',
        '--- Post to reply to ---',
        sourceText,
        '---',
      ].join('\n'),
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
      {
        name: 'prepare_reply_context',
        arguments: { sourceText, includeCitations: input.includeCitations, tone: input.tone },
      },
      ...result.toolCalls,
    ],
    turns: result.turns,
  }
}
