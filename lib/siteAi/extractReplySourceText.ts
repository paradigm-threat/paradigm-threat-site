import type { SiteAiChatTurn } from '@/lib/siteAi/askSiteAi'
import { isSiteAiReplyStarterPrompt } from '@/lib/siteAi/siteAiReplyStarters'

const MIN_SOURCE_LENGTH = 20

function extractQuotedBlocks (text: string): string[] {
  const blocks: string[] = []
  for (const m of Array.from(text.matchAll(/"([^"\n]{10,})"/g))) {
    blocks.push(m[1]!.trim())
  }
  for (const m of Array.from(text.matchAll(/'([^'\n]{10,})'/g))) {
    blocks.push(m[1]!.trim())
  }
  for (const m of Array.from(text.matchAll(/```(?:\w*\n)?([\s\S]*?)```/g))) {
    const inner = m[1]!.trim()
    if (inner.length >= MIN_SOURCE_LENGTH) blocks.push(inner)
  }
  return blocks
}

function extractSomeonePostedBlock (text: string): string | null {
  const match = text.match(/Someone posted:[\s\S]*?["']([^"']+)["']/)
  if (match && match[1]!.trim().length >= MIN_SOURCE_LENGTH) {
    return match[1]!.trim()
  }
  return null
}

function stripReplyMeta (text: string): string {
  return text
    .replace(/^I need help drafting a reply[^\n]*\n*/i, '')
    .replace(/^Help me draft a reply[^\n]*\n*/i, '')
    .replace(/Help me draft a reply using the site's antisemitism playbook[^\n]*\.?\s*/i, '')
    .replace(/^Someone posted:\s*\n*/i, '')
    .trim()
}

export type ExtractReplySourceInput = {
  question: string
  history?: SiteAiChatTurn[]
}

/** Best-effort extraction of pasted forum post text from chat turns. */
export function extractReplySourceText (input: ExtractReplySourceInput): string | null {
  const { question, history = [] } = input
  const trimmedQuestion = question.trim()

  const posted = extractSomeonePostedBlock(trimmedQuestion)
  if (posted) return posted

  for (const block of extractQuotedBlocks(trimmedQuestion)) {
    if (block.length >= MIN_SOURCE_LENGTH) return block
  }

  const strippedQuestion = stripReplyMeta(trimmedQuestion)
  if (
    strippedQuestion.length >= MIN_SOURCE_LENGTH &&
    !isSiteAiReplyStarterPrompt(trimmedQuestion)
  ) {
    return strippedQuestion
  }

  const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content.trim())
  let best: string | null = null

  for (const msg of userMessages) {
    if (isSiteAiReplyStarterPrompt(msg)) continue

    const postedFromHistory = extractSomeonePostedBlock(msg)
    if (postedFromHistory) return postedFromHistory

    for (const block of extractQuotedBlocks(msg)) {
      if (block.length >= MIN_SOURCE_LENGTH) return block
    }

    const stripped = stripReplyMeta(msg)
    if (stripped.length >= MIN_SOURCE_LENGTH) {
      if (!best || stripped.length > best.length) best = stripped
    }
  }

  return best
}

export function hasReplySourceText (input: ExtractReplySourceInput): boolean {
  return extractReplySourceText(input) !== null
}
