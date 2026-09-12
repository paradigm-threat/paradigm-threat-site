import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initSync, transpile } from '@clevertree/md2ast'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(scriptDir, '..')
const filesRoot = resolve(
  process.env.PARADIGM_THREAT_FILES_DIR ?? join(siteRoot, '..', 'paradigm-threat-files'),
)

if (!existsSync(join(filesRoot, '.git'))) {
  console.error(
    `Content repository not found at ${filesRoot}. Set PARADIGM_THREAT_FILES_DIR to its checkout path.`,
  )
  process.exit(2)
}

const { transformImageCaptions } = await import('../components/Timeline/markdownTransform.ts')
const { prepareArticleMarkdown } = await import('../lib/articleBody.ts')
const { defaultHtmlOverrides } = await import('../lib/md2ast-react/defaultOverrides.ts')
const { diagnoseMarkdownError, validateMarkdownSource } =
  await import('../lib/md2ast-react/diagnostics.ts')
const { normalizeParadigmMarkdown } =
  await import('../lib/md2ast-react/normalizeParadigmMarkdown.ts')

const customTags = [
  'PopImage',
  'OptimizedImage',
  'ChatRoom',
  'ChangeLog',
  'DeferredMarkdown',
  'DynamicIndex',
  'DynamicNav',
  'EmbedFile',
  'ImageGalleryProvider',
  'FloatingDiv',
  'ThemeToggle',
  'Navbar',
  'AutoContent',
  'Auto',
  'AutoIndex',
]
const allowedTags = [...Object.keys(defaultHtmlOverrides), ...customTags]

const wasmPath = join(siteRoot, 'node_modules/@clevertree/md2ast/md2ast_bg.wasm')
initSync({ module: readFileSync(wasmPath) })

const trackedMarkdown = execFileSync('git', ['ls-files', '*.md'], {
  cwd: filesRoot,
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const failures: Array<{
  path: string
  kind: string
  line: number | null
  message: string
}> = []

for (const relativePath of trackedMarkdown) {
  const source = readFileSync(join(filesRoot, relativePath), 'utf8')
  const prepared = normalizeParadigmMarkdown(
    transformImageCaptions(prepareArticleMarkdown(source)),
  )

  try {
    validateMarkdownSource(prepared, allowedTags)
    JSON.parse(transpile(prepared, allowedTags))
  } catch (error) {
    const diagnostics = diagnoseMarkdownError(error, prepared)
    failures.push({
      path: relativePath,
      kind: diagnostics.kind,
      line: diagnostics.line,
      message: diagnostics.headline,
    })
  }
}

if (failures.length > 0) {
  console.error(
    `Markdown compile check failed: ${failures.length}/${trackedMarkdown.length} files failed.\n`,
  )
  for (const failure of failures) {
    const location = failure.line == null ? failure.path : `${failure.path}:${failure.line}`
    console.error(`${location} [${failure.kind}] ${failure.message}`)
  }
  process.exit(1)
}

console.log(`Markdown compile check passed: ${trackedMarkdown.length} tracked files.`)
