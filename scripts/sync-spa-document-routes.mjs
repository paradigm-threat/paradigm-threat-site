#!/usr/bin/env node
/**
 * SPA mode (NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1): create app/(main)/page.tsx and move
 * `[[...slug]]` aside (Next forbids `/` + optional catch-all together).
 * Default: restore catch-all and remove page.tsx (production + social previews).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pagePath = path.join(root, 'app/(main)/page.tsx')
const slugDir = path.join(root, 'app/(main)/[[...slug]]')
const slugBackup = path.join(root, 'scripts/.spa-slug-backup/[[...slug]]')
const enabled = process.env.NEXT_PUBLIC_SPA_DOCUMENT_ROUTES === '1'

const pageSource = `import { ClientCatchAllShell } from '@/components/content/ClientCatchAllShell'

/** SPA shell at \`/\` — only present when NEXT_PUBLIC_SPA_DOCUMENT_ROUTES=1 (see scripts/sync-spa-document-routes.mjs). */
export default function MainContentPage () {
  return <ClientCatchAllShell />
}
`

function ensureSlugRestored () {
  if (fs.existsSync(slugDir)) return
  if (!fs.existsSync(slugBackup)) {
    console.error('sync-spa-document-routes: missing app/(main)/[[...slug]] — restore from git')
    process.exit(1)
  }
  fs.mkdirSync(path.dirname(slugBackup), { recursive: true })
  fs.renameSync(slugBackup, slugDir)
  console.log('sync-spa-document-routes: SPA off — restored app/(main)/[[...slug]]')
}

if (enabled) {
  fs.writeFileSync(pagePath, pageSource, 'utf8')
  if (fs.existsSync(slugDir)) {
    fs.rmSync(slugBackup, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(slugBackup), { recursive: true })
    fs.renameSync(slugDir, slugBackup)
    console.log('sync-spa-document-routes: SPA on — moved [[...slug]] to scripts/.spa-slug-backup/')
  }
  console.log('sync-spa-document-routes: SPA on — wrote app/(main)/page.tsx')
} else {
  if (fs.existsSync(pagePath)) {
    fs.unlinkSync(pagePath)
    console.log('sync-spa-document-routes: SPA off — removed app/(main)/page.tsx')
  }
  ensureSlugRestored()
}
