import {
  ANTISEMITISM_ATTACK_PROFILES,
  ANTISEMITISM_DEFINITION_PATH,
  ANTISEMITISM_PLAYBOOK_HUB,
} from '@/lib/replyAssistant/antisemitismReplyPlaybook'
import { feelingLuckyPathToHref } from '@/lib/feelingLucky'
import { SITE_CLAIMS_INDEX } from '@/lib/siteAi/siteClaimsIndex'

export type ReplyAssistantContextRow = {
  id: string
  topic: string
  summary: string
  href: string
  meta?: string
}

export type ReplyAssistantContextSection = {
  id: string
  title: string
  description: string
  rows: ReplyAssistantContextRow[]
}

/** Index path (repo-relative) → site article href. */
export function articleIndexPathToHref (path: string): string {
  let href = feelingLuckyPathToHref(path.replace(/^\//, ''))
  if (href.endsWith('/page')) href = href.slice(0, -'/page'.length)
  return href
}

function claimSummary (claim: (typeof SITE_CLAIMS_INDEX)[number]): string {
  if (claim.answerOpener?.trim()) return claim.answerOpener.trim()
  const text = claim.claim.trim()
  return text.length > 160 ? `${text.slice(0, 157)}…` : text
}

/** UI catalog — derived from SITE_CLAIMS_INDEX + ANTISEMITISM_ATTACK_PROFILES (no duplicate copy). */
export function getReplyAssistantContextSections (): ReplyAssistantContextSection[] {
  const claimRows: ReplyAssistantContextRow[] = SITE_CLAIMS_INDEX.map((claim) => ({
    id: claim.id,
    topic: claim.title,
    summary: claimSummary(claim),
    href: articleIndexPathToHref(claim.canonicalPaths[0] ?? ''),
    meta: claim.uniqueness.replace('-', ' '),
  }))

  const antisemitismRows: ReplyAssistantContextRow[] = ANTISEMITISM_ATTACK_PROFILES.map((profile) => ({
    id: profile.id,
    topic: profile.label,
    summary: profile.answerOpener,
    href: articleIndexPathToHref(profile.canonicalPath),
    meta: `Cmd. ${profile.commandments.join(', ')}`,
  }))

  return [
    {
      id: 'site-claims',
      title: 'Site thesis cards',
      description:
        'Curated conclusions the reply agent may match via get_site_claims and read_article — same index as Site AI.',
      rows: claimRows,
    },
    {
      id: 'antisemitism-playbook',
      title: 'Antisemitic attack replies',
      description:
        'When pasted text matches a trope, the agent reads the working definition (Ten Commandments §5) and the matching Substack tropes Q&A entry before drafting.',
      rows: [
        {
          id: 'working-definition',
          topic: 'Working definition + Ten Commandments',
          summary: 'Normative anti-monolithing frame and §5 speech covenant.',
          href: articleIndexPathToHref(ANTISEMITISM_DEFINITION_PATH),
        },
        {
          id: 'tropes-hub',
          topic: 'Substack tropes Q&A hub',
          summary: 'Living index for Notes-thread memes (Q1–Q8).',
          href: articleIndexPathToHref(ANTISEMITISM_PLAYBOOK_HUB),
        },
        ...antisemitismRows,
      ],
    },
  ]
}
