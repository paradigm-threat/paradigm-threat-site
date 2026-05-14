#!/usr/bin/env node
/** Postinstall: sync md2ast WASM from @clevertree/md2ast into public/. */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const r = spawnSync(process.execPath, [join(root, 'scripts/sync-md2ast-wasm.mjs')], {
  stdio: 'inherit',
  cwd: root,
})
if (r.status !== 0) process.exit(r.status ?? 1)
