/**
 * Prepare illustration prompts and CLI commands (read-only; no HF API calls).
 * Python generate-illustration.py remains the source of truth for generation.
 */

export type ImageGenBlock = {
  kind: string
  prompt: string
  aspect: string
  model: string
  date: string
  mood: string
}

export type ArticleIllustrationMeta = {
  title: string
  subtitle: string
  blocks: ImageGenBlock[]
  pendingSlots: string[]
  hasHeroImage: boolean
}

const IMAGE_GEN_BLOCK_RE = /<!--\s*image-gen:(?<kind>[\w-]+)\s*(?<body>.*?)-->/gis
const PENDING_RE = /<!--\s*image-gen:pending\s+(?<slot>\w+)\s*-->/gi
const TITLE_RE = /^#\s+(.+)$/m
const HERO_IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/

function parseImageGenBody (body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of body.trim().split('\n')) {
    const t = line.trim()
    const idx = t.indexOf(':')
    if (idx <= 0) continue
    out[t.slice(0, idx).trim().toLowerCase()] = t.slice(idx + 1).trim()
  }
  return out
}

export function parseMarkdownIllustrationMeta (content: string): ArticleIllustrationMeta {
  const blocks: ImageGenBlock[] = []
  for (const m of content.matchAll(IMAGE_GEN_BLOCK_RE)) {
    const fields = parseImageGenBody(m.groups?.body ?? '')
    blocks.push({
      kind: (m.groups?.kind ?? '').toLowerCase(),
      prompt: fields.prompt ?? '',
      aspect: fields.aspect ?? '',
      model: fields.model ?? '',
      date: fields.date ?? '',
      mood: fields.mood ?? '',
    })
  }
  const pendingSlots: string[] = []
  for (const m of content.matchAll(PENDING_RE)) {
    if (m.groups?.slot) pendingSlots.push(m.groups.slot.toLowerCase())
  }

  const titleM = content.match(TITLE_RE)
  const title = titleM?.[1]?.trim() ?? ''
  let subtitle = ''
  let hasHeroImage = false
  if (titleM?.index !== undefined) {
    const after = content.slice(titleM.index + titleM[0].length).replace(/^\n+/, '')
    for (const line of after.split('\n')) {
      const s = line.trim()
      if (!s) continue
      if (s.startsWith('#') || s.startsWith('>') || s.startsWith('<!--')) break
      if (s.startsWith('![')) {
        hasHeroImage = true
        break
      }
      subtitle = s
      break
    }
  }
  if (!hasHeroImage) hasHeroImage = HERO_IMAGE_RE.test(content.slice(0, 2000))

  return { title, subtitle, blocks, pendingSlots, hasHeroImage }
}

const FILES_HERO_STYLE =
  'Documentary concept art for a paradigm-threat.net investigation article. Epic historical illustration, dramatic lighting. No modern UI or watermarks.'

export function buildIllustrationPrompt (
  content: string,
  options: { slot?: string; extraPrompt?: string; timeline?: boolean } = {}
): string {
  const slot = options.slot ?? 'hero'
  const meta = parseMarkdownIllustrationMeta(content)
  const block = meta.blocks.find((b) => b.kind === slot || b.kind.startsWith(slot))
  const parts: string[] = [FILES_HERO_STYLE]
  if (options.timeline) {
    parts.push('Epic timeline concept art, cinematic 16:9.')
  }
  if (meta.title) parts.push(`Title: ${meta.title}`)
  if (meta.subtitle) parts.push(`Subtitle: ${meta.subtitle}`)
  if (block?.mood) parts.push(`Mood: ${block.mood}`)
  if (block?.prompt) parts.push(block.prompt)
  if (options.extraPrompt) parts.push(options.extraPrompt)
  parts.push('No watermark, no logo.')
  return parts.join('\n')
}

export function defaultOutputBasename (articlePath: string, slot: string): string {
  const base = articlePath.replace(/\.(md|mdx)$/i, '').split('/').pop() ?? 'illustration'
  return slot === 'hero' ? `${base}.png` : `${base}-${slot}.png`
}

export function buildGenerateIllustrationCli (input: {
  articlePath: string
  slot?: string
  model?: string
  aspect?: string
  dryRun?: boolean
  filesRepoScriptsDir?: string
}): string {
  const slot = input.slot ?? 'hero'
  const model = input.model ?? 'final'
  const aspect = input.aspect ?? 'hero'
  const scripts = input.filesRepoScriptsDir ?? 'paradigm-threat-files/scripts'
  let cmd = `python3 ${scripts}/generate-illustration.py --article ${JSON.stringify(input.articlePath)} --slot ${slot} --model ${model} --aspect ${aspect}`
  if (input.dryRun !== false) cmd += ' --dry-run'
  return cmd
}

export type PrepareIllustrationResult = {
  articlePath: string
  slot: string
  prompt: string
  outputBasename: string
  outputWouldOverwrite: boolean
  cliCommand: string
  cliCommandGenerate: string
}

export function prepareIllustrationFromMarkdown (input: {
  articlePath: string
  markdown: string
  outputExists?: boolean
  slot?: string
  timeline?: boolean
}): PrepareIllustrationResult {
  const slot = input.slot ?? 'hero'
  const meta = parseMarkdownIllustrationMeta(input.markdown)
  const block = meta.blocks.find((b) => b.kind === slot)
  const aspect = block?.aspect || (input.timeline ? 'timeline' : 'hero')
  const model = block?.model || 'final'
  const prompt = buildIllustrationPrompt(input.markdown, {
    slot,
    timeline: input.timeline,
  })
  return {
    articlePath: input.articlePath,
    slot,
    prompt,
    outputBasename: defaultOutputBasename(input.articlePath, slot),
    outputWouldOverwrite: Boolean(input.outputExists),
    cliCommand: buildGenerateIllustrationCli({
      articlePath: input.articlePath,
      slot,
      model,
      aspect,
      dryRun: true,
    }),
    cliCommandGenerate: buildGenerateIllustrationCli({
      articlePath: input.articlePath,
      slot,
      model,
      aspect,
      dryRun: false,
    }),
  }
}
