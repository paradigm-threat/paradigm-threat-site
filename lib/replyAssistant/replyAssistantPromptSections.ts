import { ANTISEMITISM_DEFINITION_PATH, ANTISEMITISM_PLAYBOOK_HUB } from '@/lib/replyAssistant/antisemitismReplyPlaybook'

export function replyInvestigationWorkflowSection (): string {
  return [
    '## Forum reply workflow',
    '1. Understand the pasted post.',
    '2. Call tools to search and read site content before making factual claims.',
    '3. For Q&A or FAQ-style challenges, browse Q&A paths with list_index_entries (e.g. prefix history/, query common questions or qa) and read_article on hits such as history/common-questions.md or history/chronology/history-qa/.',
    '4. Use read_article with offset when content is truncated.',
    '5. When you have enough context, write the reply — no tool markers.',
  ].join('\n')
}

export function replyAntisemitismPromptSection (): string {
  return [
    '## Antisemitic attacks (reply strategy)',
    'When the pasted post or user instructions match ethnic monolithing, blood-libel, Nazi heroics, Epstein collective guilt, Zionist-rat-hole shortcuts, or similar:',
    `1. Read ${ANTISEMITISM_DEFINITION_PATH} (§5 Ten Commandments) and the matched entry under ${ANTISEMITISM_PLAYBOOK_HUB}.`,
    '2. If prepare_reply_context included antisemitismReplyPlaybook JSON, follow matchedAttackProfiles — reply to the **original claim**, not a generic essay.',
    '3. Apply commandments by number: boundary slurs, scope actors/factions, name Jewish dissent where relevant, add institutional nodes (CIA/MI6, courts, NSA) the trope skipped.',
    '4. Criticizing Zionism/Israeli policy ≠ endorsing slurs; do not conflate.',
  ].join('\n')
}
