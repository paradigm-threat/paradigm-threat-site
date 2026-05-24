import { test, expect, type Locator } from '@playwright/test'

const CAVE_STORY_ARTICLE =
  '/influence/controlled_opposition/you-do-not-have-to-stop-loving-cave-story'

/** PopImage / OptimizedImage figures inside article markdown. */
const articleFigures = (page: import('@playwright/test').Page) =>
  page.locator('.article-markdown-region figure')

async function expectRasterLoaded (img: Locator): Promise<void> {
  await img.scrollIntoViewIfNeeded()
  await expect(img).toBeVisible({ timeout: 45_000 })

  await expect
    .poll(
      async () => (await img.evaluate((el: HTMLImageElement) => el.naturalWidth)),
      { timeout: 45_000, message: 'image should decode with non-zero dimensions' },
    )
    .toBeGreaterThan(50)

  const metrics = await img.evaluate((el: HTMLImageElement) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
    src: el.currentSrc || el.src,
  }))

  expect(metrics.w, `broken image src=${metrics.src}`).toBeGreaterThan(50)
  expect(metrics.h, `broken image src=${metrics.src}`).toBeGreaterThan(50)
  expect(metrics.src).not.toMatch(/https%3A/i)
  expect(metrics.src).not.toMatch(
    /^data:image\/gif;base64,R0lGODlhAQABAIAAAAAAAP/,
  )
}

test.describe('article images (absolute https URLs)', () => {
  test('Cave Story essay PopImages load decoded rasters', async ({ page, baseURL }) => {
    test.setTimeout(120_000)
    const onProd = baseURL?.includes('paradigmthreat.net') ?? false

    const failedRequests: string[] = []
    page.on('response', (res) => {
      const url = res.url()
      if (res.request().resourceType() !== 'image') return
      if (!url.includes('cave-story')) return
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${url}`)
    })

    await page.goto(CAVE_STORY_ARTICLE, { waitUntil: 'domcontentloaded' })

    if (onProd) {
      await expect.poll(() => page.url(), { timeout: 60_000 }).toMatch(/relaygateway\.net/)
      await expect(page.locator('body')).toContainText('You do not have to stop loving', {
        timeout: 90_000,
      })
      const imgs = page.locator('img[src*="cave-story"]')
      await expect(imgs.first()).toBeVisible({ timeout: 90_000 })
      const count = await imgs.count()
      expect(count, 'mirror HTML should include relay-hosted images').toBeGreaterThanOrEqual(1)
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expectRasterLoaded(imgs.nth(i))
      }
      expect(failedRequests, 'cave-story image HTTP failures').toEqual([])
      return
    }

    await expect(page.locator('.relay-markdown-error')).toHaveCount(0)
    await expect(page.locator('.article-markdown-region').first()).toContainText(
      'You do not have to stop loving',
      { timeout: 90_000 },
    )

    const figures = articleFigures(page)
    await expect(figures.first()).toBeVisible({ timeout: 90_000 })
    const count = await figures.count()
    expect(count, 'article should include PopImage figures').toBeGreaterThanOrEqual(2)

    for (let i = 0; i < count; i++) {
      const img = figures.nth(i).locator('img').last()
      await expectRasterLoaded(img)
    }

    expect(failedRequests, 'cave-story image HTTP failures').toEqual([])
  })
})
