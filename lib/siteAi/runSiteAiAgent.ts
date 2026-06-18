import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { createBrowserLanguageModelSession } from '@/lib/replyAssistant/browserLanguageModel'
import {
  formatToolProgressDetail,
  type SiteAiAgentProgress,
} from '@/lib/siteAi/agentProgress'
import {
  executeSiteAiTool,
  parseToolCall,
  stripToolMarkers,
} from '@/lib/siteAi/siteAiToolBridge'

export type { SiteAiAgentProgress } from '@/lib/siteAi/agentProgress'

export type RunSiteAiAgentInput = {
  systemPrompt: string
  conversation: LanguageModelMessage[]
  maxTurns?: number
  minFinalLength?: number
  finalInstruction?: string
  signal?: AbortSignal
  onProgress?: (event: SiteAiAgentProgress) => void
}

export type RunSiteAiAgentResult = {
  finalText: string
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>
  turns: number
  conversation: LanguageModelMessage[]
}

const DEFAULT_MAX_TURNS = 8

async function runToolWithProgress (
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: (event: SiteAiAgentProgress) => void
): Promise<string> {
  const detail = formatToolProgressDetail(toolName, args)
  onProgress?.({ phase: 'tool', toolName, status: 'start', args, detail })
  try {
    return await executeSiteAiTool(toolName, args)
  } finally {
    onProgress?.({ phase: 'tool', toolName, status: 'done', args, detail })
  }
}

export async function runSiteAiAgent (input: RunSiteAiAgentInput): Promise<RunSiteAiAgentResult> {
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS
  const minFinalLength = input.minFinalLength ?? 12
  const finalInstruction = input.finalInstruction ?? 'Write your final answer as plain prose (no tool markers).'

  input.onProgress?.({ phase: 'init', message: 'Starting investigation…' })

  const session = await createBrowserLanguageModelSession(input.systemPrompt, {
    signal: input.signal,
    onSessionProgress: (p) => {
      if (p.kind === 'downloading') {
        input.onProgress?.({
          phase: 'loading-model',
          message: p.message,
          loaded: p.loaded,
        })
      } else if (p.kind === 'checking') {
        input.onProgress?.({ phase: 'loading-model', message: p.message })
      }
    },
  })

  const toolCalls: RunSiteAiAgentResult['toolCalls'] = []
  const conversation = [...input.conversation]

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      input.onProgress?.({
        phase: 'thinking',
        turn: turn + 1,
        message: turn === 0
          ? 'Analyzing your request…'
          : `Thinking (step ${turn + 1})…`,
      })

      const response = await session.prompt(conversation, { signal: input.signal })
      const toolCall = parseToolCall(response)

      if (toolCall) {
        toolCalls.push({ name: toolCall.name, arguments: toolCall.arguments })
        const toolResult = await runToolWithProgress(
          toolCall.name,
          toolCall.arguments,
          input.onProgress
        )
        conversation.push({ role: 'assistant', content: response })
        conversation.push({
          role: 'user',
          content: `Tool result for ${toolCall.name}:\n${toolResult}\n\nContinue investigating or ${finalInstruction}`,
        })
        continue
      }

      input.onProgress?.({ phase: 'writing', message: 'Composing answer…' })

      const finalText = stripToolMarkers(response).trim()
      if (finalText.length >= minFinalLength) {
        conversation.push({ role: 'assistant', content: finalText })
        return { finalText, toolCalls, turns: turn + 1, conversation }
      }

      conversation.push({ role: 'assistant', content: response })
      conversation.push({ role: 'user', content: finalInstruction })
    }

    throw new Error('Investigation took too many steps — try a shorter or more specific question')
  } finally {
    session.destroy()
  }
}
