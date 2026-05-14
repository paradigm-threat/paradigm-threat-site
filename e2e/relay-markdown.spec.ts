import { test, expect } from '@playwright/test'

test.describe('relay-markdown WASM glue', () => {
  test('serves md2ast.js and wasm from public/', async ({ request }) => {
    const js = await request.get('/wasm/md2ast/md2ast.js')
    expect(js.status(), await js.text()).toBe(200)
    expect(js.headers()['content-type'] ?? '').toMatch(/javascript|ecmascript/i)

    const wasm = await request.get('/wasm/md2ast/md2ast_bg.wasm')
    expect(wasm.status()).toBe(200)
    expect(wasm.headers()['content-type'] ?? '').toMatch(/wasm/i)
  })

  test('homepage SSR includes seo article HTML', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBeLessThan(500)
    const html = await res.text()
    expect(html).toContain('data-seo-fallback')
    expect(html).toContain('Welcome to Paradigm Threat')
    expect(html).toContain('Change Log')
  })

  test('homepage renders page.md with ChangeLog', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('.relay-markdown-error')).toHaveCount(0)
    await expect(page.locator('.article-markdown-region').first()).toContainText('Welcome to Paradigm Threat')
  })
})

test.describe('relay-markdown article render (local files :3010)', () => {
  test('blog index renders without compile error panel', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    await expect(page.locator('.relay-markdown-error')).toHaveCount(0)
    await expect(page.locator('.mdx-content').first()).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('.mdx-content').first()).not.toContainText('Loading markdown…')
  })

  test('article with ChatRoom and AutoIndex renders markdown body', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/cosmos/mars', { waitUntil: 'networkidle' })
    await expect(page.locator('.relay-markdown-error')).toHaveCount(0)
    const region = page.locator('.article-markdown-region').first()
    await expect(region).toContainText('Deep State', { timeout: 90_000 })
    await expect(region).toContainText('War of the Worlds', { timeout: 90_000 })
    await expect(region).toContainText('What is the Deep State', { timeout: 90_000 })
    await expect(region).not.toContainText('![#')
  })
})
