import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import {
  replyAntisemitismPromptSection,
  replyInvestigationWorkflowSection,
} from '@/lib/replyAssistant/replyAssistantPromptSections'
import { REPLY_INVESTIGATION_TOOL_NAMES } from '@/lib/replyAssistant/replyInvestigationTools'
import { TOOL_CALL_END, TOOL_CALL_START } from '@/lib/siteAi/siteAiToolBridge'

export type BuildReplySystemPromptInput = {
  includeCitations: boolean
  tone?: string
  instructions?: string
}

export function buildReplySystemPrompt (input: BuildReplySystemPromptInput): string {
  const citationLine = input.includeCitations
    ? 'When the user asked for citations, append a short Sources footer with article titles and canonical URLs from articles you read.'
    : 'Do not include article URLs or a link dump unless essential to the argument.'

  const toolList = REPLY_INVESTIGATION_TOOL_NAMES.map((n) => `- ${n}`).join('\n')
  const userInstructions = input.instructions?.trim()

  return [
    'You draft forum replies grounded in paradigm-threat.net articles.',
    '',
    getProjectPerspective(),
    '',
    replyInvestigationWorkflowSection(),
    '',
    replyAntisemitismPromptSection(),
    '',
    ...(userInstructions
      ? [
        '## User reply instructions',
        'The visitor provided direction for angle, tone, or emphasis. Follow these closely when they conflict with defaults:',
        userInstructions,
        '',
      ]
      : []),
    '## Allowed tools',
    toolList,
    '',
    '## Tool call format',
    'When you need a tool, respond with ONLY this block (no other text):',
    TOOL_CALL_START,
    '{"name":"<tool_name>","arguments":{...}}',
    TOOL_CALL_END,
    '',
    `Tone: ${input.tone ?? 'conversational'}. ${citationLine}`,
    'Investigate iteratively; read articles before citing them.',
    'Final output must be the reply prose only — ready to paste into a forum.',
  ].join('\n')
}

/** @deprecated Use buildReplySystemPrompt — kept for regression tests during rename. */
export function buildReplyAgentPrompt (input: {
  sourceText: string
  includeCitations: boolean
  tone?: string
}): string {
  const base = buildReplySystemPrompt(input)
  return [
    base,
    '',
    '--- Post to reply to ---',
    input.sourceText.trim(),
    '---',
  ].join('\n')
}
