import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { createBrowserLanguageModelSession } from '@/lib/replyAssistant/browserLanguageModel'
import { buildReplySystemPrompt } from '@/lib/replyAssistant/agentPrompt'
import {
  executeReplyInvestigationTool,
  parseToolCall,
  stripToolMarkers,
} from '@/lib/replyAssistant/replyToolBridge'

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

const MAX_AGENT_TURNS = 8

export async function draftReplyWithBrowserAi (input: DraftReplyInput): Promise<DraftReplyResult> {
  const sourceText = input.sourceText.trim()
  if (sourceText.length < 20) {
    throw new Error('Paste at least 20 characters before drafting a reply')
  }

  input.onProgress?.({ phase: 'starting' })

  const systemPrompt = buildReplySystemPrompt({
    includeCitations: input.includeCitations,
    tone: input.tone,
  })

  const session = await createBrowserLanguageModelSession(systemPrompt, input.signal)
  const toolCalls: DraftReplyResult['toolCalls'] = []

  try {
    input.onProgress?.({ phase: 'tool', toolName: 'prepare_reply_context' })
    const seedContext = await executeReplyInvestigationTool('prepare_reply_context', {
      sourceText,
      includeCitations: input.includeCitations,
      tone: input.tone ?? 'conversational',
    })
    toolCalls.push({
      name: 'prepare_reply_context',
      arguments: { sourceText, includeCitations: input.includeCitations, tone: input.tone },
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

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      input.onProgress?.({ phase: 'drafting' })
      const response = await session.prompt(conversation, { signal: input.signal })
      const toolCall = parseToolCall(response)

      if (toolCall) {
        input.onProgress?.({ phase: 'tool', toolName: toolCall.name })
        toolCalls.push({ name: toolCall.name, arguments: toolCall.arguments })
        const toolResult = await executeReplyInvestigationTool(toolCall.name, toolCall.arguments)
        conversation.push({ role: 'assistant', content: response })
        conversation.push({
          role: 'user',
          content: `Tool result for ${toolCall.name}:\n${toolResult}\n\nContinue investigating or write the final reply (prose only, no tool markers).`,
        })
        continue
      }

      const draft = stripToolMarkers(response).trim()
      if (draft.length >= 20) {
        return { draft, toolCalls, turns: turn + 1 }
      }

      conversation.push({ role: 'assistant', content: response })
      conversation.push({
        role: 'user',
        content: 'Please write the full forum reply now as plain prose (no tool markers).',
      })
    }

    throw new Error('Reply drafting took too many steps — try a shorter post or draft again')
  } finally {
    session.destroy()
  }
}
