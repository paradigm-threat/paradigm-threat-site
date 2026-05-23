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
  if (exportRes.status !== 307) {
    fail(`${BASE}/export/ — expected HTTP 307 redirect, got ${exportRes.status}`)
  }
  const exportLoc = exportRes.headers.get('location') || ''
  if (!exportLoc.includes('relaygateway.net') || !exportLoc.includes('/export')) {
    fail(`${BASE}/export/ — expected Location on timeline mirror /export/, got ${exportLoc}`)
  }

  const ttsRes = await fetch(`${BASE}/api/tts/piper`, { method: 'POST' })
  if (ttsRes.status !== 410) {
    fail(`${BASE}/api/tts/piper — expected HTTP 410 (proxy removed), got ${ttsRes.status}`)
  }

  await expectHead(`${FILES_MIRROR}/index.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(`${TIMELINE_MIRROR}/data/events.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(
    `${FILES_MIRROR}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png?w=400`,
    { contentTypeIncludes: 'image/' },
  )

  const articleUrl = `${BASE}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md`
  const articleHtml = await fetch(articleUrl, { redirect: 'follow' }).then((r) => {
    if (!r.ok) fail(`${articleUrl} — expected 200, got ${r.status}`)
    return r.text()
  })
  const ogImage = extractMeta(articleHtml, 'og:image')
  assertRelayOg(ogImage, articleUrl)
  await expectHead(ogImage, { contentTypeIncludes: 'image/' })

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

  console.log('smoke-production: all checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
