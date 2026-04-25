import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { flattenFilesIndex } from '../components/helpers/indexHelper'
import { isNonArticlePath } from '../lib/isNonArticlePath'

function resolveIndexJsonPath (): string {
  return (
    process.env.PLAYWRIGHT_INDEX_JSON ??
    path.join(process.cwd(), '..', 'paradigm-threat-files', 'index.json')
  )
}

function buildUrlsFromIndex (index: unknown): string[] {
  const entries = flattenFilesIndex(index as Record<string, unknown>)
  const urls = new Set<string>()
  for (const { path: p } of entries) {
    if (!p || p === 'index.json') continue
    const slug = p.replace(/^\/+/, '')
    if (isNonArticlePath(slug)) continue
    const pathname = `/${slug}`.replace(/\/+/g, '/')
    urls.add(pathname)
  }
  return [...urls].sort((a, b) => a.localeCompare(b))
}

function applyLimitOffsetSample (urls: string[]): string[] {
  const offset = Math.max(0, Number(process.env.PLAYWRIGHT_INDEX_OFFSET ?? '0') || 0)
  const limitRaw = process.env.PLAYWRIGHT_INDEX_LIMIT
  const noCap = limitRaw === '0'
  const limit =
    limitRaw === undefined || limitRaw === '' ? 150 : noCap ? urls.length : Math.max(0, Number(limitRaw) || 150)

  let slice = noCap ? urls.slice(offset) : urls.slice(offset, offset + limit)

  if (process.env.PLAYWRIGHT_INDEX_SAMPLE === '1' && slice.length > 0 && !noCap) {
    const cap = Math.min(limit, slice.length)
    const shuffled = [...slice]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }
    slice = shuffled.slice(0, cap)
  }

  return slice
}

function loadCrawlUrls (): string[] {
  const indexPath = resolveIndexJsonPath()
  if (!fs.existsSync(indexPath)) {
    return []
  }
  try {
    const raw = fs.readFileSync(indexPath, 'utf8')
    const index = JSON.parse(raw) as unknown
    return applyLimitOffsetSample(buildUrlsFromIndex(index))
  } catch {
    return []
  }
}

const crawlUrls = loadCrawlUrls()

const BENIGN_CONSOLE: RegExp[] = [
  /^\[HMR\]/i,
  /^\[Fast Refresh\]/i,
  /^\[Violation\]/i,
  /Download the React DevTools/i,
  /was preloaded using link preload but not used/i,
]

function isBenignConsole (text: string): boolean {
  return BENIGN_CONSOLE.some((re) => re.test(text))
}

if (crawlUrls.length === 0) {
  test('index crawl: requires sibling paradigm-threat-files/index.json or PLAYWRIGHT_INDEX_JSON', () => {
    expect(
      fs.existsSync(resolveIndexJsonPath()),
      `Expected index at ${resolveIndexJsonPath()}`
    ).toBe(true)
  })
} else {
  test.describe('index.json crawl', () => {
    for (const pathname of crawlUrls) {
      test(`renders without crash: ${pathname}`, async ({ page }) => {
        const consoleErrors: string[] = []
        const pageErrors: string[] = []

        page.on('console', (msg) => {
          if (msg.type() !== 'error') return
          const text = msg.text()
          if (isBenignConsole(text)) return
          consoleErrors.push(text)
        })

        page.on('pageerror', (err) => {
          pageErrors.push(err.message)
        })

        const res = await page.goto(pathname, { waitUntil: 'domcontentloaded' })
        expect(res, `no response for ${pathname}`).toBeTruthy()
        expect(res!.status(), `HTTP ${res!.status()} for ${pathname}`).toBeLessThan(500)

        await expect(page.locator('header img[alt="Paradigm Threat"]').first()).toBeVisible({ timeout: 45_000 })

        await expect(page.getByText('Application error: a client-side exception', { exact: false })).toHaveCount(0)
        await expect(page.getByText('Unhandled Runtime Error', { exact: false })).toHaveCount(0)

        expect(pageErrors, `pageerror on ${pathname}: ${pageErrors.join(' | ')}`).toEqual([])
        expect(consoleErrors, `console.error on ${pathname}: ${consoleErrors.join(' | ')}`).toEqual([])
      })
    }
  })
}
