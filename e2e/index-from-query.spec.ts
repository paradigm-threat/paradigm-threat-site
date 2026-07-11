import { test, expect } from '@playwright/test'
import { flattenFilesIndex } from '../components/helpers/indexHelper'
import { isNonArticlePath } from '../lib/isNonArticlePath'
import { rebuildFilesIndexTree } from '../lib/queryCatalog'

function filesBaseUrl (): string {
  return (
    process.env.PLAYWRIGHT_FILES_BASE_URL ||
    process.env.NEXT_PUBLIC_FILES_BASE_URL ||
    'https://dfw1.relaygateway.net/paradigm-threat-files'
  ).replace(/\/+$/, '')
}

function buildUrlsFromIndex (index: unknown): string[] {
  const entries = flattenFilesIndex(index as Record<string, unknown>)
  const urls = new Set<string>()
  for (const { path: p } of entries) {
    if (!p) continue
    const slug = p.replace(/^\/+/, '')
    if (isNonArticlePath(slug) && !slug.toLowerCase().endsWith('.txt')) continue
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

async function loadCrawlUrlsFromQuery (): Promise<string[]> {
  const origin = filesBaseUrl()
  const res = await fetch(origin, {
    method: 'QUERY',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'query',
      collection: 'index',
      query: '',
      limit: 10_000,
    }),
  })
  if (!res.ok) {
    throw new Error(`QUERY ${origin} failed: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { results?: Record<string, unknown>[] }
  const results = Array.isArray(data.results) ? data.results : []
  if (!results.some((r) => typeof r.path === 'string')) {
    throw new Error(`QUERY ${origin} returned no path catalog rows`)
  }
  const tree = rebuildFilesIndexTree(results)
  return applyLimitOffsetSample(buildUrlsFromIndex(tree))
}

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

test.describe('QUERY files catalog crawl', () => {
  test('renders sample paths without crash', async ({ page }) => {
    const crawlUrls = await loadCrawlUrlsFromQuery()
    expect(crawlUrls.length, 'expected crawl URLs from Relay QUERY').toBeGreaterThan(0)

    for (const pathname of crawlUrls) {
      const consoleErrors: string[] = []
      const pageErrors: string[] = []

      const onConsole = (msg: { type: () => string; text: () => string }) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (isBenignConsole(text)) return
        consoleErrors.push(text)
      }
      const onPageError = (err: Error) => {
        pageErrors.push(err.message)
      }

      page.on('console', onConsole)
      page.on('pageerror', onPageError)

      try {
        const res = await page.goto(pathname, { waitUntil: 'domcontentloaded' })
        expect(res, `no response for ${pathname}`).toBeTruthy()
        expect(res!.status(), `HTTP ${res!.status()} for ${pathname}`).toBeLessThan(500)

        await expect(page.locator('header img[alt="Paradigm Threat"]').first()).toBeVisible({
          timeout: 45_000,
        })

        await expect(page.getByText('Application error: a client-side exception', { exact: false })).toHaveCount(0)
        await expect(page.getByText('Unhandled Runtime Error', { exact: false })).toHaveCount(0)

        expect(pageErrors, `pageerror on ${pathname}: ${pageErrors.join(' | ')}`).toEqual([])
        expect(consoleErrors, `console.error on ${pathname}: ${consoleErrors.join(' | ')}`).toEqual([])
      } finally {
        page.off('console', onConsole)
        page.off('pageerror', onPageError)
      }
    }
  })
})
