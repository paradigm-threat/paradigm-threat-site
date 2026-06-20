/**
 * Reply strategy for common antisemitic attacks — anchored in the in-repo
 * Working Definition §5 (Ten Commandments) and Substack tropes Q&A.
 * Agents must still read_article on matched canonical paths before quoting details.
 */

export type AntisemitismAttackProfile = {
  id: string
  label: string
  /** Substrings / phrases that suggest this attack (normalized matching) */
  tropes: string[]
  /** Working-definition §5 commandments (1–10) that govern the reply */
  commandments: number[]
  /** Lead sentence when this profile matches */
  answerOpener: string
  /** How to structure the reply to this specific claim */
  responseStrategy: string
  canonicalPath: string
  relatedPaths: string[]
  doNotSay: string[]
}

export const ANTISEMITISM_PLAYBOOK_HUB = 'history/chronology/qa/substack-tropes/page.md'

export const ANTISEMITISM_DEFINITION_PATH =
  'history/chronology/investigations/paradigm-threat-working-definition-antisemitism.md'

/** Short mnemonic for agents — full text in definition file §5 */
export const TEN_COMMANDMENTS_SUMMARY: ReadonlyArray<{ n: number; gist: string }> = [
  { n: 1, gist: 'No monolithing Abrahamic houses — one lip only kindleth race-war.' },
  { n: 2, gist: 'No “the Jews” as single counsel when archives show factions and dissent.' },
  { n: 3, gist: 'No perpetual Judah vs Christendom vs Ishmael blood feud in the flesh.' },
  { n: 4, gist: 'No intra-Jewish monolithing (Mizrahi, Sephardi, LGBTQ, secular erased).' },
  { n: 5, gist: 'No beating flat any holy people — dissidents and syncretists included.' },
  { n: 6, gist: 'No binding empire/revolution on Judaism alone or Jews as one mind.' },
  { n: 7, gist: 'Gatekeepers: no shadowban/deboost the scribe without open writ.' },
  { n: 8, gist: 'Structure talk OK — separate bankers/Hollywood/globalists from “all Hebrews one side.”' },
  { n: 9, gist: 'No false witness of blood/lineage to scourge a whole house; genealogy needs primaries.' },
  { n: 10, gist: 'Labor for unity — primaries and networks without fear of the gate alone.' },
]

export const ANTISEMITISM_ATTACK_PROFILES: AntisemitismAttackProfile[] = [
  {
    id: 'q01-monolithing',
    label: '“All Jews evil / Satanic / inherited evil”',
    tropes: [
      'all jews', 'jews are evil', 'satanic jew', 'inherited evil', 'evil incarnate',
      'happy merchant', 'jewish evil', 'the jews are', 'jews control everything',
    ],
    commandments: [1, 2, 4, 5, 6, 8],
    answerOpener:
      'Collective essential evil is monolithing — forbidden under our working definition; real scandals name actors and factions, not “the Jews.”',
    responseStrategy: [
      'Name the trope (essential evil / monolith) and cite commandments I, II, VI, VIII.',
      'Acknowledge what is sometimes true underneath: named Jewish-identified actors in history exist — without collapsing to one intent.',
      'Demand scope: one outlet, one faction, one docket — plus documented Jewish dissent on the same policy.',
      'Redirect to institutional lanes (CIA/MI6, finance nodes, courts) the slur was avoiding.',
      'Boundary the slur; do not debate “are Jews Satanic.”',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q01-monolithing-inherited-evil.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'history/chronology/investigations/jewish-press-revolutionary-russia-verified-quotations.md',
    ],
    doNotSay: [
      'Agree that Jews are collectively evil or Satanic.',
      'Dismiss every scandal mention because the poster used a slur — separate substance from slur.',
    ],
  },
  {
    id: 'q02-hitler-rothschild',
    label: 'Hitler was Rothschild / Jewish Hitler genealogy',
    tropes: [
      'hitler jewish', 'hitler rothschild', 'rothschild hitler', 'schicklgruber',
      'hitler was a jew', 'hitler was a rothschild', 'hitler was rothschild',
      'jewish hitler', 'rothschild bloodline',
    ],
    commandments: [6, 8, 9, 10],
    answerOpener:
      'Genealogy memes swap one bloodline mask for another — they skip Paperclip, compartments, and primaries.',
    responseStrategy: [
      'Separate three questions: institutional continuity post-WWII (Paperclip, Gehlen) vs Hitler personal ancestry vs why the chart is pushed now.',
      'Commandment IX: lineage claims need archives, not meme charts; many scholarly lines reject the popular rumor.',
      'Commandment VI/VIII: do not replace Nazi mask with Rothschild mask — both are single-villain topology.',
      'Hold contradiction: Western intelligence recycled Nazi assets without requiring Hitler to be secret Rothschild.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q02-hitler-rothschild-genealogy-swap.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'governance/war/investigations/cia-investigation.md',
      'influence/controlled_opposition/captured-courts-wrong-villain.md',
    ],
    doNotSay: [
      'Assert Hitler was Jewish/Rothschild as settled fact from a meme.',
      'Use the chart to imply all Jews caused Nazism.',
    ],
  },
  {
    id: 'q03-nazi-heroics',
    label: 'Heroic Nazis vs evil Jews (dual cartoon)',
    tropes: [
      'heroic nazi', 'nazi hero', 'death in june', 'jews are cowards', 'nazi jew',
      'ss aesthetic', 'wehrmacht honor', 'jewish coward',
    ],
    commandments: [1, 2, 3, 5, 6],
    answerOpener:
      'Reject the pairing outright — Nazi hagiography and Jewish essential evil are the same monolith error in mirror form.',
    responseStrategy: [
      'Commandments I–III: reject dual essentialism; both sides erase resistance, dissent, and civilians.',
      'You may hold: postwar institutions preserved useful Nazi layers AND the Nazi regime was mass-murder machinery.',
      'Note CO geometry: Type-B flank taints threads so moderates flee — do not feed the pairing.',
      'If Israel/Zionism critique appears adjacent, separate policy argument from Nazi hero worship.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q03-nazi-heroics-vs-jewish-evil.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'governance/war/investigations/cia-investigation.md',
    ],
    doNotSay: [
      'Praise or aestheticize Nazis to “balance” an attack on Jews.',
      'Essentialize Jewish cowardice or collective guilt for WWII.',
    ],
  },
  {
    id: 'q04-epstein-collective',
    label: 'Epstein → all Jews pedophiles / collective guilt',
    tropes: [
      'epstein jew', 'all jews pedophile', 'rabbi epstein', 'jewish pedophile',
      'they abuse their children', 'epstein proves jews',
    ],
    commandments: [2, 4, 5, 8, 9],
    answerOpener:
      'The Epstein docket is real forensic territory — collective guilt from one case is blood-libel topology, not analysis.',
    responseStrategy: [
      'Commandment II/§4.5: one Jewish-identified criminal ≠ Judaism as essence.',
      'Legitimate: who enabled by name, which institutions failed, intelligence/finance hypotheses with tiers.',
      'Name non-Jewish principals in the same networks (royals, politicians, agencies).',
      'Boundary rabbi/blood-libel memes; engage docket questions only with scope.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q04-epstein-collective-guilt.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'events/false_flag/investigations/good-actor-theory-interagency-antibody-investigation.md',
    ],
    doNotSay: [
      'Defend Epstein or minimize the case to avoid addressing antisemitism.',
      'Leap from Epstein to “all Jews.”',
    ],
  },
  {
    id: 'q05-zionist-rat-hole',
    label: '“Zionist rat hole” as whole deep state',
    tropes: [
      'zionist rat', 'rat hole', 'zionists did 9', 'zionist deep state',
      'jews did 9/11', 'zionists control', 'zionist hole',
    ],
    commandments: [6, 8, 10],
    answerOpener:
      'Zionist ideology and U.S.–Israel alliance are fair policy lanes — exhaustive ethnic explanation without CIA/MI6/courts is ethnic exit, not depth.',
    responseStrategy: [
      'Commandment VIII: structure talk allowed — unanimity of all Jews on one side is not.',
      'Three-layer stack: (1) policy/alliance facts, (2) long Iran/CIA file, (3) courts/agencies without “Zionist” as magic word.',
      'Reader test: can poster name one non-Zionist node (NSA, Treasury, CENTCOM, UK Foreign Office) on same timeline?',
      'Point to captured-courts “wrong villain” pattern — substance dies when thread is retired as bigotry.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q05-zionist-rat-hole-ethnic-exit.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'influence/controlled_opposition/captured-courts-wrong-villain.md',
      'influence/controlled_opposition/investigations/brsinv-st-julian-captured-courts-zionist-framing-investigation.md',
    ],
    doNotSay: [
      'Treat Zionism as sole explanation for 9/11, courts, or all geopolitics.',
      'Conflate criticizing Israeli policy with this ethnic-exhaustive trope.',
    ],
  },
  {
    id: 'q06-iran-war-blame',
    label: 'Iran war — Jews started it / coward Nazi Jews',
    tropes: [
      'jews started the war', 'jews lost iran', 'coward jew', 'nazi jew iran',
      'jews want war iran', 'israel jews war', 'idf nazi',
    ],
    commandments: [1, 2, 3, 6],
    answerOpener:
      'Separate four clocks: strike ledger, negotiation/MoU, alliance politics, and ethnic slur noise — monolithing Jews is not analysis of Iran 2026.',
    responseStrategy: [
      'Commandment VI: do not bind the war on Judaism alone.',
      'Use Iran war Q&A for two scoreboards, HEU casus belli, 1953→Shah→latency board.',
      'Reject IDF=Nazi cartoon mirror — same one-mask logic as the slur thread.',
      'Hold: oppose war, mourn casualties, doubt MoU — and reject “all Jews started it” in same breath.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q06-iran-war-blame-monolith.md',
    relatedPaths: [
      'governance/war/qa/page.md',
      'governance/war/qa/q01-we-lost-versus-two-scoreboards.md',
      'governance/war/mission-accomplished-again-iran-2026.md',
    ],
    doNotSay: [
      'Explain Iran war as Jews collectively starting or losing it.',
      'Replace policy analysis with ethnic slur counters.',
    ],
  },
  {
    id: 'q07-thread-chaos',
    label: 'Thread chaos / schizoposting / bot loops',
    tropes: [
      'schizopost', 'bot thread', 'nice humans bad room', 'same slur loop',
      'inheritance of evil restack', 'controlled opposition thread',
    ],
    commandments: [7, 10],
    answerOpener:
      'When the room runs slur loops instead of dockets, boundary the noise and keep talking to readers who want structure.',
    responseStrategy: [
      'Give heuristics: slur-only restacks vs dates/primaries/institutions.',
      'Commandment VII: opaque moderation fuels paranoia — do not become another silent gate.',
      'Do not assume bot without evidence; do not write off entire threads.',
      'Document tropes so lurkers are not alone — point to Substack tropes Q&A hub.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q07-substack-thread-chaos.md',
    relatedPaths: [ANTISEMITISM_PLAYBOOK_HUB, ANTISEMITISM_DEFINITION_PATH],
    doNotSay: [
      'Engage slur loops line-by-line as if good-faith debate.',
      'Claim all critics are bots without evidence.',
    ],
  },
  {
    id: 'q08-biblical-slurs',
    label: 'Biblical slurs / blood-libel memes over crowd photos',
    tropes: [
      'abraham incest', 'sarah incest', 'genesis 20:12', 'hasidic meme',
      'biblical slur', 'blood libel', 'jewish incest',
    ],
    commandments: [2, 5, 9],
    answerOpener:
      'Text criticism of ancient sources is legitimate scholarship — crowd-photo blood libel is collective punishment, not exegesis.',
    responseStrategy: [
      'Commandment IX: no false witness of blood to scourge a whole house.',
      'If goal is scholarship: manuscript tradition, commentary — without living people as props.',
      'If goal is Notes engagement: same error class as Q1 monolithing — boundary it.',
      'Apply same text-critical standards you would to Greek/Roman/Islamic founding myths.',
    ].join(' '),
    canonicalPath: 'history/chronology/qa/substack-tropes/q08-biblical-slurs-blood-libel-memes.md',
    relatedPaths: [
      ANTISEMITISM_DEFINITION_PATH,
      'history/chronology/investigations/jew-word-terminology-judas-judicial.md',
    ],
    doNotSay: [
      'Use biblical snippets to condemn living Jewish communities collectively.',
      'Defend every biblical literalism to “win” against a slur meme.',
    ],
  },
]

export type MatchedAntisemitismAttack = AntisemitismAttackProfile & {
  matchScore: number
  matchedTropes: string[]
}

function normalize (text: string): string {
  return text.toLowerCase().replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function matchAntisemitismAttacks (
  text: string,
  options?: { maxResults?: number }
): MatchedAntisemitismAttack[] {
  const maxResults = options?.maxResults ?? 2
  const q = normalize(text)
  if (q.length < 8) return []

  const scored: MatchedAntisemitismAttack[] = []

  for (const profile of ANTISEMITISM_ATTACK_PROFILES) {
    const matchedTropes: string[] = []
    let score = 0
    for (const trope of profile.tropes) {
      const t = normalize(trope)
      if (t.length < 4) continue
      if (q.includes(t)) {
        matchedTropes.push(trope)
        score += 3 + Math.min(t.split(/\s+/).length, 4)
      }
    }
    if (score > 0) {
      scored.push({ ...profile, matchScore: score, matchedTropes })
    }
  }

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, maxResults)
}

export function antisemitismPlaybookSeedPaths (
  matches: MatchedAntisemitismAttack[]
): string[] {
  const paths = new Set<string>([
    ANTISEMITISM_DEFINITION_PATH,
    ANTISEMITISM_PLAYBOOK_HUB,
    'history/chronology/page.md',
  ])
  for (const m of matches) {
    paths.add(m.canonicalPath)
    for (const p of m.relatedPaths) paths.add(p)
  }
  return Array.from(paths)
}

export function formatAntisemitismPlaybookForPrompt (
  matches: MatchedAntisemitismAttack[]
): string {
  if (matches.length === 0) return ''

  const commandmentsRef = TEN_COMMANDMENTS_SUMMARY.map(
    (c) => `${c.n}. ${c.gist}`
  ).join('\n')

  const profiles = matches.map((m) => ({
    id: m.id,
    label: m.label,
    matchedTropes: m.matchedTropes,
    commandments: m.commandments,
    answerOpener: m.answerOpener,
    responseStrategy: m.responseStrategy,
    readFirst: m.canonicalPath,
    relatedPaths: m.relatedPaths,
    doNotSay: m.doNotSay,
  }))

  return JSON.stringify({
    normativeAnchor: ANTISEMITISM_DEFINITION_PATH,
    tropesHub: ANTISEMITISM_PLAYBOOK_HUB,
    tenCommandmentsSummary: commandmentsRef,
    matchedAttackProfiles: profiles,
    agentInstructions: [
      'Read readFirst path for the matched trope, then working definition §5 for commandments.',
      'Reply to the ORIGINAL claim: name the trope, apply the listed commandments, hold contradictory truths where the Q&A says to.',
      'Boundary slurs; engage substance (docket, dates, institutions) where it exists.',
      'Never collapse to “the Jews” — scope factions, dissent, and non-Jewish nodes on the same timeline.',
    ].join(' '),
  }, null, 2)
}

export function antisemitismReplyAgentInstructions (
  matches: MatchedAntisemitismAttack[]
): string {
  if (matches.length === 0) return ''
  const ids = matches.map((m) => m.id).join(', ')
  return `Antisemitic attack pattern detected (${ids}). Use antisemitismReplyPlaybook in the seed: read matched Q&A file first, apply Ten Commandments §5, reply specific to the original claim — not a generic lecture.`
}
