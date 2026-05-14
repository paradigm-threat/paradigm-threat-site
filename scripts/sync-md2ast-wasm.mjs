#!/usr/bin/env node
/** Copy md2ast WASM glue from @clevertree/md2ast to public/ for Next.js static serving. */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmDest = join(root, 'public/wasm/md2ast')
const wasmSrc = join(root, 'node_modules/@clevertree/md2ast')

const files = ['md2ast.js', 'md2ast_bg.wasm', 'md2ast.d.ts']
if (!files.every((f) => existsSync(join(wasmSrc, f)))) {
  console.error('[sync-md2ast-wasm] missing @clevertree/md2ast wasm bundle. Run: pnpm install')
  process.exit(1)
}

mkdirSync(wasmDest, { recursive: true })
for (const name of files) {
  cpSync(join(wasmSrc, name), join(wasmDest, name))
}
console.log(`[sync-md2ast-wasm] copied from ${wasmSrc} → public/wasm/md2ast/`)
