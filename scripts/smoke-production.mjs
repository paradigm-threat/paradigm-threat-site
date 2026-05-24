#!/usr/bin/env node
/**
 * Production smoke checks: relay mirrors, OG images on primary mirror (no /files/ proxy).
 *
 * Usage:
 *   npm run smoke:prod
 *   SMOKE_BASE_URL=https://staging.example npm run smoke:prod
 *   SMOKE_FILES_MIRROR=https://paradigm-threat-files.atlanta3.relaygateway.net npm run smoke:prod
 *
 * Exit 0 on success, 1 on any failure.
 */

const BASE = (process.env.SMOKE_BASE_URL || 'https://paradigmthreat.net').replace(/\/$/, '')

function firstOrigin (raw, fallback) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return fallback.replace(/\/$/, '')
  return trimmed.split(/\s+/)[0].replace(/\/$/, '')
}

const FILES_MIRROR = firstOrigin(
  process.env.SMOKE_FILES_MIRROR || process.env.NEXT_PUBLIC_FILES_BASE_URL,
  'https://paradigm-threat-files.atlanta3.relaygateway.net',
)
const TIMELINE_MIRROR = firstOrigin(
  process.env.SMOKE_TIMELINE_MIRROR || process.env.NEXT_PUBLIC_TIMELINE_BASE_URL,
  'https://paradigm-threat-timeline.atlanta3.relaygateway.net',
)

function fail (msg) {
  console.error('smoke-production:', msg)
  process.exit(1)
}

async function expectHead (url, { status = 200, contentTypeIncludes = null, redirect = 'follow' }) {
  const res = await fetch(url, { method: 'HEAD', redirect })
  if (res.status !== status) {
    fail(`${url} — expected HTTP ${status}, got ${res.status}`)
  }
  if (contentTypeIncludes) {
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!ct.includes(contentTypeIncludes.toLowerCase())) {
      fail(`${url} — expected Content-Type to include "${contentTypeIncludes}", got "${ct}"`)
    }
  }
}

function extractMeta (html, property) {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`property="${esc}"\\s+content="([^"]*)"`, 'i')
  const m = html.match(re)
  return m ? m[1] : null
}

function assertRelayOg (ogImage, label) {
  if (!ogImage) fail(`${label} — missing og:image`)
  if (ogImage.includes('/files/')) {
    fail(`${label} — og:image must not use ${BASE}/files/ proxy — got ${ogImage}`)
  }
  let host
  try {
    host = new URL(ogImage).hostname
  } catch {
    fail(`${label} — invalid og:image URL ${ogImage}`)
  }
  if (!host.endsWith('.relaygateway.net')) {
    fail(`${label} — og:image should be on a relay mirror (*.relaygateway.net) — got ${ogImage}`)
  }
  if (!/\?w=\d+/.test(ogImage) && /\.(png|jpe?g|gif|webp|avif)/i.test(ogImage)) {
    fail(`${label} — raster og:image should include ?w= — got ${ogImage}`)
  }
}

async function main () {
  console.log('smoke-production: base =', BASE)
  console.log('smoke-production: files mirror =', FILES_MIRROR)
  console.log('smoke-production: timeline mirror =', TIMELINE_MIRROR)

  await expectHead(`${BASE}/files/index.json`, { status: 404 })
  await expectHead(`${BASE}/api/image?url=test`, { status: 404 })

  const exportRes = await fetch(`${BASE}/export/`, { method: 'HEAD', redirect: 'manual' })
  if (exportRes.status !== 307 && exportRes.status !== 308) {
    fail(`${BASE}/export/ — expected HTTP 307/308 redirect, got ${exportRes.status}`)
  }
  const exportLoc = exportRes.headers.get('location') || ''
  const exportLocOk =
    (exportLoc.startsWith('http') && exportLoc.includes('relaygateway.net') && exportLoc.includes('/export')) ||
    exportLoc === '/export' ||
    exportLoc.startsWith('/export/')
  if (!exportLocOk) {
    fail(`${BASE}/export/ — expected timeline /export/ redirect Location, got ${exportLoc}`)
  }

  const ttsRes = await fetch(`${BASE}/api/tts/piper`, { method: 'POST' })
  // 410 after deploy; 400 may appear briefly on older builds that still parsed the body
  if (ttsRes.status !== 410 && ttsRes.status !== 400) {
    fail(`${BASE}/api/tts/piper — expected HTTP 410 (proxy removed), got ${ttsRes.status}`)
  }

  await expectHead(`${FILES_MIRROR}/index.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(`${TIMELINE_MIRROR}/data/events.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(
    `${FILES_MIRROR}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png?w=400`,
    { contentTypeIncludes: 'image/' },
  )

  const articlePath =
    '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'
  const articleUrl = `${BASE}${articlePath}`
  const articleProbe = await fetch(articleUrl, { redirect: 'manual' })
  if ([307, 308].includes(articleProbe.status)) {
    const loc = articleProbe.headers.get('location') || ''
    if (!loc.includes('relaygateway.net')) {
      fail(`${articleUrl} — expected mirror redirect Location, got ${loc}`)
    }
    if (!loc.includes('controlled-demolition-investigation.md')) {
      fail(`${articleUrl} — redirect should target .md on mirror, got ${loc}`)
    }
    console.log('smoke-production: article SSR redirect to mirror OK —', loc)
  } else {
    const articleHtml = await fetch(articleUrl, { redirect: 'follow' }).then((r) => {
      if (!r.ok) fail(`${articleUrl} — expected 200 or 307, got ${r.status}`)
      return r.text()
    })
    const ogImage = extractMeta(articleHtml, 'og:image')
    assertRelayOg(ogImage, articleUrl)
    await expectHead(ogImage, { contentTypeIncludes: 'image/' })
  }

  const rasterUrl = `${BASE}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png`
  const rasterHead = await fetch(rasterUrl, { method: 'HEAD', redirect: 'manual' })
  if ([307, 308].includes(rasterHead.status)) {
    const loc = rasterHead.headers.get('location') || ''
    if (!loc.includes('relaygateway.net')) {
      fail(`${rasterUrl} — expected mirror redirect, got ${loc}`)
    }
    await expectHead(loc, { contentTypeIncludes: 'image/' })
  }

  const timelinePageUrl = `${BASE}/timeline/evt-introduction`
  const timelineHtml = await fetch(timelinePageUrl, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    redirect: 'follow',
  }).then((r) => {
    if (!r.ok) fail(`${timelinePageUrl} — expected 200, got ${r.status}`)
    return r.text()
  })
  const tlOg = extractMeta(timelineHtml, 'og:image')
  if (tlOg) {
    assertRelayOg(tlOg, timelinePageUrl)
    await expectHead(tlOg, { contentTypeIncludes: 'image/' })
  } else {
    console.log('smoke-production: timeline page has no og:image (skipped)')
  }

  if (process.env.SMOKE_OPS_DISABLED === '1') {
    const searchRes = await fetch(`${BASE}/api/search-index`)
    if (searchRes.status !== 503) {
      fail(`${BASE}/api/search-index — expected HTTP 503 (client-side search), got ${searchRes.status}`)
    }
    const luckyRes = await fetch(`${BASE}/api/feeling-lucky`)
    if (luckyRes.status !== 503) {
      fail(`${BASE}/api/feeling-lucky — expected HTTP 503 (client-side lucky), got ${luckyRes.status}`)
    }
    const chatRes = await fetch(`${BASE}/api/chat/getChannels`)
    if (chatRes.status !== 503) {
      fail(`${BASE}/api/chat/getChannels — expected HTTP 503 when ops disabled, got ${chatRes.status}`)
    }
    const searchPage = await fetch(`${BASE}/search`)
    if (!searchPage.ok) {
      fail(`${BASE}/search — expected HTTP 200 (search UI enabled), got ${searchPage.status}`)
    }
    const searchHtml = await searchPage.text()
    if (searchHtml.includes('Search paused during Relay transition')) {
      fail(`${BASE}/search — search UI should not show paused banner`)
    }
    const homeRes = await fetch(`${BASE}/`, { redirect: 'manual' })
    if (homeRes.status !== 200) {
      fail(`${BASE}/ — expected HTTP 200 (Next app shell), got ${homeRes.status}`)
    }
    const samplePath =
      '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'
    const articleRes = await fetch(`${BASE}${samplePath}`, { redirect: 'manual' })
    if (articleRes.status === 307 || articleRes.status === 308) {
      fail(
        `${BASE}${samplePath} — articles must not redirect to mirror HTML (breaks client shell), got ${articleRes.status}`,
      )
    }
    console.log('smoke-production: ops-disabled checks passed')
  }

  console.log('smoke-production: all checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
