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

  test('/api/tts/piper returns 410', async ({ request }) => {
    const res = await request.post('/api/tts/piper', {
      data: { text: 'test', voiceId: 'en' },
    })
    expect(res.status()).toBe(410)
  })
})

test.describe('relay assets SSR (production)', () => {
  test.skip(
    ({ baseURL }) => !baseURL?.includes('paradigmthreat.net'),
    'Set PLAYWRIGHT_BASE_URL=https://paradigmthreat.net',
  )

  test('investigation article: relay mirror (redirect or SSR og:image), no /files/', async ({
    request,
  }) => {
    const res = await request.get(INVESTIGATION_ARTICLE, {
      headers: { 'User-Agent': CRAWLER_UA },
      maxRedirects: 0,
    })
    if ([307, 308].includes(res.status())) {
      const loc = res.headers()['location'] || ''
      expect(loc).toMatch(/relaygateway\.net/)
      const mirror = await request.get(loc, { headers: { 'User-Agent': CRAWLER_UA } })
      expect(mirror.status()).toBe(200)
      const html = await mirror.text()
      expect(html).not.toMatch(/paradigmthreat\.net\/files\//)
      return
    }
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).not.toMatch(/paradigmthreat\.net\/files\//)

    const ogImage = extractOgImage(html)
    expect(ogImage).toBeTruthy()
    expect(ogImage).toMatch(/\.relaygateway\.net\//)
    if (ogImage && /\.(png|jpe?g|webp|avif)/i.test(ogImage)) {
      expect(ogImage).toMatch(/\?w=\d+/)
    }
    expect(ogImage).not.toMatch(/investigations\/events\/false_flag\/investigations\//)
  })

  test('timeline event og:image is relay raster with ?w=', async ({ request }) => {
    const res = await request.get('/timeline/evt-introduction', {
      headers: { 'User-Agent': CRAWLER_UA },
    })
    expect(res.status()).toBe(200)
    const ogImage = extractOgImage(await res.text())
    expect(ogImage).toBeTruthy()
    expect(ogImage).toMatch(/paradigm-threat-timeline.*\.relaygateway\.net/)
    expect(ogImage).toMatch(/\.(png|jpe?g|webp)/i)
  })
})

test.describe('relay assets browser (production)', () => {
  test.skip(
    ({ baseURL }) => !baseURL?.includes('paradigmthreat.net'),
    'Set PLAYWRIGHT_BASE_URL=https://paradigmthreat.net',
  )

  test('investigation article images load from relay', async ({ page }) => {
    test.setTimeout(120_000)

    const failedImages: string[] = []
    page.on('response', (res) => {
      if (res.request().resourceType() !== 'image') return
      if (res.url().includes('relaygateway.net') && res.status() >= 400) {
        failedImages.push(`${res.status()} ${res.url()}`)
      }
    })

    await page.goto(INVESTIGATION_ARTICLE, { waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.url(), { timeout: 60_000 }).toMatch(/relaygateway\.net/)
    await expect(page.locator('body')).toContainText(/controlled demolition|AE911|Richard Gage/i, {
      timeout: 90_000,
    })

    const img = page.locator('img[src*="richard-gage-ae911truth-controlled-demolition-investigation"]').first()
    await expectRasterLoaded(img)
    const src = (await img.getAttribute('src')) || ''
    expect(src).toMatch(/investigation.*\.png/i)
    expect(src).not.toMatch(/investigations\/events\/false_flag\/investigations\//)
    expect(failedImages).toEqual([])
  })
})
