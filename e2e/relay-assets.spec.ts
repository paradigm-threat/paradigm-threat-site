import { test, expect, type Locator } from '@playwright/test'

async function expectRasterLoaded (img: Locator): Promise<void> {
  await img.scrollIntoViewIfNeeded()
  await expect(img).toBeVisible({ timeout: 60_000 })
  await expect
    .poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth), {
      timeout: 60_000,
    })
    .toBeGreaterThan(50)
}

const INVESTIGATION_ARTICLE =
  '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'

const CRAWLER_UA = 'facebookexternalhit/1.1'

function extractOgImage (html: string): string | null {
  const m = html.match(/property="og:image"\s+content="([^"]*)"/i)
  return m ? m[1] : null
}

test.describe('legacy proxy 404 (local build)', () => {
  test.skip(
    ({ baseURL }) => !!baseURL?.includes('paradigmthreat.net'),
    'Production still serves catch-all until deploy with app/files + app/api/image routes',
  )

  test('legacy /files/ and /api/image return 404', async ({ request }) => {
    const filesRes = await request.head('/files/index.json')
    expect(filesRes.status()).toBe(404)

    const apiRes = await request.head('/api/image?url=test')
    expect(apiRes.status()).toBe(404)
  })

  test('/export redirects to timeline mirror (no proxy body)', async ({ request }) => {
    const res = await request.head('/export/', { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    const loc = res.headers()['location'] || ''
    expect(loc).toMatch(/relaygateway\.net\/export/)
  })

  test('/api/tts/piper returns 410 or 503', async ({ request }) => {
    const res = await request.post('/api/tts/piper', {
      data: { text: 'test', voiceId: 'en' },
    })
    expect([410, 503]).toContain(res.status())
  })
})

test.describe('relay assets (production)', () => {
  test.skip(
    ({ baseURL }) => !baseURL?.includes('paradigmthreat.net'),
    'Set PLAYWRIGHT_BASE_URL=https://paradigmthreat.net',
  )

  test('investigation article stays on site origin', async ({ request }) => {
    const res = await request.get(INVESTIGATION_ARTICLE, {
      headers: { 'User-Agent': CRAWLER_UA },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).not.toMatch(/paradigmthreat\.net\/files\//)
    const ogImage = extractOgImage(html)
    if (ogImage) {
      expect(ogImage).toMatch(/\.relaygateway\.net\//)
      if (/\.(png|jpe?g|webp|avif)/i.test(ogImage)) {
        expect(ogImage).toMatch(/\?w=\d+/)
      }
      expect(ogImage).not.toMatch(/investigations\/events\/false_flag\/investigations\//)
    }
  })

  test('timeline event page loads on site origin', async ({ request }) => {
    const res = await request.get('/timeline/evt-introduction', {
      headers: { 'User-Agent': CRAWLER_UA },
    })
    expect(res.status()).toBe(200)
    expect(res.url()).toMatch(/paradigmthreat\.net/)
  })

  test('legacy /files/timeline raster redirects to timeline relay mirror', async ({ request }) => {
    const legacyPath =
      '/files/timeline/media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png'
    const res = await request.head(legacyPath, { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    const loc = res.headers()['location'] || ''
    expect(loc).toMatch(/relaygateway\.net\/paradigm-threat-timeline\/media\/15\.ce-21st-the-final-struggle\/15\.08\.00-historical-antibodies\.png/)
    expect(loc).toMatch(/\?w=\d+/)
  })

  test('investigation article images load from relay in browser', async ({ page }) => {
    test.setTimeout(120_000)

    const failedImages: string[] = []
    page.on('response', (res) => {
      if (res.request().resourceType() !== 'image') return
      if (res.url().includes('relaygateway.net') && res.status() >= 400) {
        failedImages.push(`${res.status()} ${res.url()}`)
      }
    })

    await page.goto(INVESTIGATION_ARTICLE, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/paradigmthreat\.net/)
    await expect(page.locator('body')).toContainText(/controlled demolition|AE911|Richard Gage/i, {
      timeout: 90_000,
    })

    await expect
      .poll(
        async () => page.locator('img[src*="relaygateway.net"][src*="investigation"]').count(),
        { timeout: 90_000 },
      )
      .toBeGreaterThan(0)
    const img = page.locator('img[src*="relaygateway.net"][src*="investigation"]').first()
    await expectRasterLoaded(img)
    const src = (await img.getAttribute('src')) || ''
    expect(src).toMatch(/relaygateway\.net/i)
    expect(src).toMatch(/investigation.*\.png/i)
    expect(src).not.toMatch(/investigations\/events\/false_flag\/investigations\//)
    expect(failedImages).toEqual([])
  })

  test('homepage markdown images load from relay after client render', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toContainText(/Welcome to Paradigm Threat/i, { timeout: 90_000 })
    await expect
      .poll(async () => page.locator('img[src*="relaygateway.net"]').count(), { timeout: 90_000 })
      .toBeGreaterThan(0)
    const img = page.locator('img[src*="relaygateway.net"]').first()
    await expectRasterLoaded(img)
  })
})
