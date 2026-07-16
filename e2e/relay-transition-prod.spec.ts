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

  test('home has no site-wide relay transition banner', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/client-side pages/i)).toHaveCount(0)
    await expect(page.getByText(/Server-side rendering is off/i)).toHaveCount(0)
  })

  test('search UI enabled (client-side index, no pause banner)', async ({ page }) => {
    await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Search paused during Relay transition/i)).toHaveCount(0)
    const searchInput = page.getByPlaceholder(/Type keywords/i)
    await expect(searchInput).toBeVisible({ timeout: 30_000 })
    await expect(searchInput).toBeEnabled()
  })

  test('chat page loads Relay chat UI', async ({ page }) => {
    await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Relay public chat|Public Repository Chat/i)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/Chat disabled until Relay migration/i)).toHaveCount(0)
  })

  test('home and articles stay on paradigmthreat.net with app shell', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/paradigmthreat\.net\/?$/)
    await expect(page.locator('body')).toContainText(/Welcome to Paradigm Threat/i, {
      timeout: 90_000,
    })
    await expect(page.locator('body')).not.toContainText('<ChangeLog />')

    await page.goto(`${BASE}${INVESTIGATION_ARTICLE}`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).toMatch(/paradigmthreat\.net/)
    expect(page.url()).not.toMatch(/relaygateway\.net/)
    await expect(page.locator('body')).toContainText(/controlled demolition|AE911|Richard Gage/i, {
      timeout: 90_000,
    })
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

  test('legacy server APIs return 503 (client uses Relay)', async ({ request }) => {
    const search = await request.get(`${BASE}/api/search-index`)
    expect(search.status()).toBe(503)
    const lucky = await request.get(`${BASE}/api/feeling-lucky`)
    expect(lucky.status()).toBe(503)
    const timelineJson = await request.get(`${BASE}/api/timeline-json`)
    expect(timelineJson.status()).toBe(503)
    const chat = await request.get(`${BASE}/api/chat/getChannels`)
    const chatCt = (chat.headers()['content-type'] || '').toLowerCase()
    // Catch-all [[...slug]] may serve SPA HTML for removed API paths.
    expect(chat.ok && chatCt.includes('application/json')).toBe(false)
  })

  test('Feeling Lucky uses client index not API', async ({ page }) => {
    test.setTimeout(120_000)
    let luckyApiCalls = 0
    page.on('request', (req) => {
      if (req.url().includes('/api/feeling-lucky')) luckyApiCalls++
    })
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    const btn = page.getByRole('button', { name: /I'm Feeling Lucky/i })
    await expect(btn).toBeEnabled({ timeout: 30_000 })
    await btn.click()
    await expect
      .poll(() => page.url(), { timeout: 90_000 })
      .toMatch(/^https:\/\/paradigmthreat\.net\/[^?#]+\/?$/)
    expect(page.url()).not.toMatch(/paradigmthreat\.net\/?$/)
    expect(luckyApiCalls).toBe(0)
  })
})
