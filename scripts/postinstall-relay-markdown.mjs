#!/usr/bin/env node
/** Postinstall: compile relay-markdown from monorepo source + sync WASM. */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** pnpm `file:` hardlinks `dist/` from monorepo — run tsc there so new modules appear. */
const relayMarkdownSource = join(root, '../../relay/relay-gateway/packages/relay-markdown')

if (existsSync(join(relayMarkdownSource, 'tsconfig.json'))) {
  const tsc = spawnSync('npm', ['run', 'build:ts'], {
    stdio: 'inherit',
    cwd: relayMarkdownSource,
    shell: process.platform === 'win32',
  })
  if (tsc.status !== 0) process.exit(tsc.status ?? 1)
}

const r = spawnSync(process.execPath, [join(root, 'scripts/sync-relay-markdown-wasm.mjs')], {
  stdio: 'inherit',
  cwd: root,
})
if (r.status !== 0) process.exit(r.status ?? 1)
