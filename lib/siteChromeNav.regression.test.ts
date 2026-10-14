import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SITE_CHROME_NAV,
  isSiteChromeNavActive,
  productionSiteHref,
} from './siteChromeNav.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('siteChromeNav', () => {
  it('points Home at production apex, Search at archive, Timeline/Chat at app subdomains', () => {
    assert.equal(SITE_CHROME_NAV.home, 'https://paradigmthreat.net/')
    assert.equal(SITE_CHROME_NAV.search, 'https://old.paradigmthreat.net/search')
    assert.equal(SITE_CHROME_NAV.timeline, 'https://timeline.paradigmthreat.net/')
    assert.equal(SITE_CHROME_NAV.chat, 'https://paradigmthreat.net/chat')
    assert.equal(productionSiteHref('/'), 'https://paradigmthreat.net/')
  })

  it('marks Timeline active on timeline subdomain and /timeline paths', () => {
    assert.equal(
      isSiteChromeNavActive(SITE_CHROME_NAV.timeline, '/timeline', 'timeline.paradigmthreat.net'),
      true,
    )
    assert.equal(
      isSiteChromeNavActive(SITE_CHROME_NAV.timeline, '/timeline/evt-x', 'old.paradigmthreat.net'),
      true,
    )
    assert.equal(
      isSiteChromeNavActive(SITE_CHROME_NAV.home, '/timeline', 'timeline.paradigmthreat.net'),
      false,
    )
  })

  it('Navbar and FooterSiteNav use absolute chrome destinations', () => {
    const navbar = readFileSync(join(root, 'components/Navbar/Navbar.tsx'), 'utf8')
    const footer = readFileSync(join(root, 'components/FooterSiteNav.tsx'), 'utf8')
    assert.match(navbar, /SITE_CHROME_NAV/)
    assert.match(footer, /SITE_CHROME_NAV/)
    assert.match(navbar, /productionBannerHref/)
    assert.match(navbar, /productionSiteHref|SITE_CHROME_NAV\.home/)
    assert.doesNotMatch(navbar, /href:\s*'\/'\s*,\s*label:\s*'Home'/)
    assert.doesNotMatch(navbar, /href:\s*'\/timeline'/)
    assert.doesNotMatch(navbar, /href:\s*'\/chat'/)
  })
})
