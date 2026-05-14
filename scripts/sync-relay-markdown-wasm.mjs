#!/usr/bin/env node
/**
 * Copy md2ast WASM glue to public/ for Next.js static serving.
 * Tries pnpm-linked package first, then monorepo relay-markdown source (file: deps
 * often omit wasm binaries from node_modules).
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmDest = join(root, 'public/wasm/md2ast')

const candidates = [
  join(root, 'node_modules/@clevertree/relay-markdown/wasm'),
  join(root, '../../relay/relay-gateway/packages/relay-markdown/wasm'),
]

const wasmSrc = candidates.find((dir) => {
  if (!existsSync(dir)) return false
  return existsSync(join(dir, 'md2ast.js')) && existsSync(join(dir, 'md2ast_bg.wasm'))
})

if (!wasmSrc) {
  console.error('[sync-relay-markdown-wasm] no md2ast wasm bundle found. Run: cd relay/relay-gateway/packages/relay-markdown && npm run build')
  process.exit(1)
}

mkdirSync(wasmDest, { recursive: true })
for (const name of readdirSync(wasmSrc)) {
  if (name === 'README.md' || name === '.gitignore') continue
  cpSync(join(wasmSrc, name), join(wasmDest, name))
}
console.log(`[sync-relay-markdown-wasm] copied from ${wasmSrc} → public/wasm/md2ast/`)
