#!/usr/bin/env node
/**
 * Production smoke checks: /files proxies, canonical OG images, timeline OG.
 *
 * Usage:
 *   npm run smoke:prod
 *   SMOKE_BASE_URL=https://staging.example npm run smoke:prod
 *
 * Exit 0 on success, 1 on any failure.
 */

const BASE = (process.env.SMOKE_BASE_URL || 'https://paradigmthreat.net').replace(/\/$/, '')

function fail (msg) {
  console.error('smoke-production:', msg)
  process.exit(1)
}

async function expectHead (url, { status = 200, contentTypeIncludes = null }) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
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

async function main () {
  console.log('smoke-production: base =', BASE)

  await expectHead(`${BASE}/files/index.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(`${BASE}/files/timeline/data/events.json`, { contentTypeIncludes: 'application/json' })
  await expectHead(
    `${BASE}/files/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png`,
    { contentTypeIncludes: 'image/png' },
  )

  const articleUrl = `${BASE}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.md`
  const articleHtml = await fetch(articleUrl, { redirect: 'follow' }).then((r) => {
    if (!r.ok) fail(`${articleUrl} — expected 200, got ${r.status}`)
    return r.text()
  })
  const ogImage = extractMeta(articleHtml, 'og:image')
  if (!ogImage) fail(`${articleUrl} — missing og:image`)
  if (!ogImage.startsWith(`${BASE}/files/`)) {
    fail(`og:image should be under ${BASE}/files/ — got ${ogImage}`)
  }
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
  if (!tlOg) fail(`${timelinePageUrl} — missing og:image`)
  if (!tlOg.startsWith(`${BASE}/files/timeline/`)) {
    fail(`timeline og:image should be under ${BASE}/files/timeline/ — got ${tlOg}`)
  }
  await expectHead(tlOg, { contentTypeIncludes: 'image/' })

  console.log('smoke-production: all checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
