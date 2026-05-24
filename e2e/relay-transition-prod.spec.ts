import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://paradigmthreat.net'

const INVESTIGATION_ARTICLE =
  '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'

const INVESTIGATION_PNG =
  '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png'

test.describe('Relay transition (production)', () => {
  test.skip(
    () => !BASE.includes('paradigmthreat.net'),
    'Set PLAYWRIGHT_BASE_URL=https://paradigmthreat.net',
  )

  test('site shows transition banner on search', async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Transitioning to full Relay-powered delivery/i)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/Search paused during Relay transition/i)).toBeVisible()
  })

  test('chat shows paused message', async ({ page }) => {
    await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Chat paused during Relay transition/i)).toBeVisible({
      timeout: 30_000,
    })
  })

  test('article path redirects to relay mirror and content loads', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`${BASE}${INVESTIGATION_ARTICLE}`, { waitUntil: 'domcontentloaded' })
    await expect
      .poll(() => page.url(), { timeout: 60_000 })
      .toMatch(/relaygateway\.net/)
    await expect(page.locator('body')).toContainText(/controlled demolition|AE911|Richard Gage/i, {
      timeout: 90_000,
    })
    expect(page.url()).toMatch(/\.md$|controlled-demolition-investigation\.md/)
  })

  test('raster on site origin redirects to relay and decodes', async ({ request }) => {
    const head = await request.head(`${BASE}${INVESTIGATION_PNG}`, { maxRedirects: 0 })
    expect([307, 308]).toContain(head.status())
    const loc = head.headers()['location'] || ''
    expect(loc).toMatch(/relaygateway\.net/)

    const img = await request.get(loc || `${BASE}${INVESTIGATION_PNG}`)
    expect(img.status()).toBe(200)
    const ct = img.headers()['content-type'] || ''
    expect(ct.toLowerCase()).toMatch(/image\//)
    expect((await img.body()).length).toBeGreaterThan(1000)
  })

  test('timeline stays on paradigmthreat.net', async ({ page }) => {
    await page.goto(`${BASE}/timeline/evt-introduction`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/paradigmthreat\.net\/timeline/)
    expect(page.url()).not.toMatch(/relaygateway\.net/)
  })

  test('search and chat APIs return 503 when paused', async ({ request }) => {
    const search = await request.get(`${BASE}/api/search-index`)
    expect(search.status()).toBe(503)
    const chat = await request.get(`${BASE}/api/chat/getChannels`)
    expect(chat.status()).toBe(503)
  })
})
