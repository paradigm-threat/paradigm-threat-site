import type { LanguageModelMessage } from '@/lib/replyAssistant/browserLanguageModel'
import { createBrowserLanguageModelSession } from '@/lib/replyAssistant/browserLanguageModel'
import {
  executeSiteAiTool,
  parseToolCall,
  stripToolMarkers,
} from '@/lib/siteAi/siteAiToolBridge'

export type SiteAiAgentProgress =
  | { phase: 'starting' }
  | { phase: 'tool'; toolName: string }
  | { phase: 'drafting' }

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

export async function runSiteAiAgent (input: RunSiteAiAgentInput): Promise<RunSiteAiAgentResult> {
  const maxTurns = input.maxTurns ?? DEFAULT_MAX_TURNS
  const minFinalLength = input.minFinalLength ?? 12
  const finalInstruction = input.finalInstruction ?? 'Write your final answer as plain prose (no tool markers).'

  input.onProgress?.({ phase: 'starting' })

  const session = await createBrowserLanguageModelSession(input.systemPrompt, input.signal)
  const toolCalls: RunSiteAiAgentResult['toolCalls'] = []
  const conversation = [...input.conversation]

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      input.onProgress?.({ phase: 'drafting' })
      const response = await session.prompt(conversation, { signal: input.signal })
      const toolCall = parseToolCall(response)

      if (toolCall) {
        input.onProgress?.({ phase: 'tool', toolName: toolCall.name })
        toolCalls.push({ name: toolCall.name, arguments: toolCall.arguments })
        const toolResult = await executeSiteAiTool(toolCall.name, toolCall.arguments)
        conversation.push({ role: 'assistant', content: response })
        conversation.push({
          role: 'user',
          content: `Tool result for ${toolCall.name}:\n${toolResult}\n\nContinue investigating or ${finalInstruction}`,
        })
        continue
      }

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
