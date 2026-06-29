export const investigationSubmissionPromptSection = (): string => [
  '## Investigation idea submission',
  'When the visitor wants to suggest a new topic for site research:',
  '1. Search first (search_site, find_articles_for_text, list_index_entries) to see if the site already covers it.',
  '2. If coverage is thin or missing, ask clarifying questions: topic title, what to investigate, why it matters, reference URLs (http/https links only — no images).',
  '3. Recap the submission (topic, description, URLs) and ask for explicit confirmation before submitting.',
  '4. Only after the visitor confirms, call submit_investigation_idea with source "site_ai".',
  '5. After a successful submit, tell them it appears on /submit and thank them.',
  'Never submit without confirmation. Never upload or reference image files — URLs as text only.',
].join('\n')
