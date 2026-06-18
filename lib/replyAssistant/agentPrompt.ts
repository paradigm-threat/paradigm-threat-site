import { getProjectPerspective } from '@/lib/replyAssistant/projectPerspective'

export type BuildAgentPromptInput = {
  sourceText: string
  includeCitations: boolean
  tone?: string
}

export function buildReplyAgentPrompt (input: BuildAgentPromptInput): string {
  const citationLine = input.includeCitations
    ? 'Include a short Sources footer with article titles and canonical URLs.'
    : 'Do not include article URLs or a link dump unless essential.'

  return [
    'Draft a forum reply grounded in paradigm-threat site articles.',
    '',
    getProjectPerspective(),
    '',
    'Use WebMCP tools on this tab to investigate:',
    '- get_project_perspective — re-read this worldview seed if needed',
    '- search_site, expand_search_keywords, list_index_entries — find candidates',
    '- read_article — read markdown content (use offset when truncated)',
    '- prepare_reply_context — optional index-only seed from the paste below',
    '- format_reply_citations — format citation footer when links are requested',
    '',
    `Tone: ${input.tone ?? 'conversational'}. ${citationLine}`,
    'Investigate iteratively; do not assume — read articles before citing them.',
    'Write in Paradigm Threat perspective above; ground specific claims in articles you read.',
    '',
    '--- Post to reply to ---',
    input.sourceText.trim(),
    '---',
  ].join('\n')
}
