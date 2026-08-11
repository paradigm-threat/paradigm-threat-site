import { test, expect } from '@playwright/test'

/**
 * Guards the PWA surprise-reload regression:
 * next-pwa default reloadOnOnline:true called location.reload() on online.
 */
test.describe('PWA online behavior', () => {
  test('offline → online does not wipe the document session', async ({ page, context, baseURL }) => {
    test.setTimeout(90_000)
    const article =
      '/governance/war/investigations/presidential-alignment-globalist-vs-nationalist-investigation'

    await page.addInitScript(() => {
      ;(window as unknown as { __ptE2eSession?: string }).__ptE2eSession =
        'e2e-' + Math.random().toString(36).slice(2, 10)
      ;(window as unknown as { __ptE2eEvents?: string[] }).__ptE2eEvents = []
      const push = (t: string) => {
        ;(window as unknown as { __ptE2eEvents: string[] }).__ptE2eEvents.push(t)
      }
      window.addEventListener('offline', () => push('offline'))
      window.addEventListener('online', () => push('online'))
      window.addEventListener('beforeunload', () => push('beforeunload'))
    })

    await page.goto(`${baseURL?.replace(/\/$/, '') || ''}${article}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 60_000 })

    const sessionBefore = await page.evaluate(
      () => (window as unknown as { __ptE2eSession?: string }).__ptE2eSession || '',
    )
    expect(sessionBefore).toMatch(/^e2e-/)

    await context.setOffline(true)
    await page.waitForTimeout(800)
    await context.setOffline(false)
    await page.waitForTimeout(2500)

    const after = await page.evaluate(() => {
      const w = window as unknown as {
        __ptE2eSession?: string
        __ptE2eEvents?: string[]
      }
      return {
        session: w.__ptE2eSession || '',
        events: w.__ptE2eEvents || [],
        bodyLen: document.body?.innerText?.length || 0,
      }
    })

    expect(after.events, 'should observe online after offline').toContain('online')
    expect(after.events, 'must not hard-unload on online').not.toContain('beforeunload')
    expect(after.session, 'SPA session must survive online').toBe(sessionBefore)
    expect(after.bodyLen).toBeGreaterThan(1000)
  })
})
