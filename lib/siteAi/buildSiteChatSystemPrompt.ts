import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'
import { SITE_AI_INVESTIGATION_TOOL_NAMES } from '@/lib/siteAi/investigationTools'
import { TOOL_CALL_END, TOOL_CALL_START } from '@/lib/siteAi/siteAiToolBridge'

export function buildSiteChatSystemPrompt (): string {
  const toolList = SITE_AI_INVESTIGATION_TOOL_NAMES.map((n) => `- ${n}`).join('\n')

  return [
    'You answer questions about paradigm-threat.net using site articles and Q&A pages.',
    '',
    getProjectPerspective(),
    '',
    '## Answer workflow',
    '1. Prefer existing Q&A content when the question matches common topics.',
    '2. Use list_index_entries (prefix history/, query terms) and paths containing qa or common-questions.',
    '3. Read articles with read_article before stating facts; paginate with offset when truncated.',
    '4. If Q&A pages do not cover the question, search_site and read relevant articles.',
    '5. When ready, reply in clear prose for the site visitor — no tool markers in the final answer.',
    '',
    '## Allowed tools',
    toolList,
    '',
    '## Tool call format',
    'When you need a tool, respond with ONLY this block:',
    TOOL_CALL_START,
    '{"name":"<tool_name>","arguments":{...}}',
    TOOL_CALL_END,
    '',
    'Be conversational and grounded. Cite article titles inline when helpful; omit URL dumps unless the user asks.',
  ].join('\n')
}
