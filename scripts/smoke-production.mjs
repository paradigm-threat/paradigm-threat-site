#!/usr/bin/env node
/**
 * Production smoke checks: relay mirrors, OG images on primary mirror (no /files/ proxy).
 *
 * Usage:
 *   npm run smoke:prod
 *   SMOKE_BASE_URL=https://staging.example npm run smoke:prod
 *   SMOKE_FILES_MIRROR=https://paradigm-threat-files.dfw1.relaygateway.net npm run smoke:prod
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
  'https://paradigm-threat-files.dfw1.relaygateway.net',
)
const TIMELINE_MIRROR = firstOrigin(
  process.env.SMOKE_TIMELINE_MIRROR || process.env.NEXT_PUBLIC_TIMELINE_BASE_URL,
  'https://paradigm-threat-timeline.dfw1.relaygateway.net',
)
const CHAT_MIRROR = firstOrigin(
  process.env.SMOKE_CHAT_MIRROR ||
    process.env.NEXT_PUBLIC_CHAT_RELAY_ORIGIN ||
    (FILES_MIRROR.includes('paradigm-threat-files.')
      ? FILES_MIRROR.replace('paradigm-threat-files.', 'paradigm-threat-site.')
      : ''),
  'https://paradigm-threat-site.dfw1.relaygateway.net',
)

function piperBases () {
  const raw =
    process.env.PIPER_API_URLS ||
    process.env.NEXT_PUBLIC_PIPER_API_URLS ||
    'https://dfw1.relaygateway.net https://lon1.relaygateway.net https://hkg1.relaygateway.net'
  return raw
    .trim()
    .split(/\s+/)
    .map((b) => b.replace(/\/+$/, ''))
    .filter(Boolean)
}

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
  // 503 when server Relay fetch disabled; 410 when proxy removed but flag allows route
  if (![410, 400, 503].includes(ttsRes.status)) {
    fail(`${BASE}/api/tts/piper — expected HTTP 410/503 (use relay Piper in browser), got ${ttsRes.status}`)
  }

  // Catalog health via QUERY (site no longer GETs index.json / events.json)
  for (const [label, origin, collection] of [
    ['files', FILES_MIRROR, 'index'],
    ['timeline-events', TIMELINE_MIRROR, 'events'],
  ]) {
    const qRes = await fetch(`${origin.replace(/\/$/, '')}/`, {
      method: 'QUERY',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ collection, query: '', limit: 1 }),
    })
    if (!qRes.ok) {
      fail(`QUERY ${label} ${origin} — expected HTTP 200, got ${qRes.status}`)
    }
    const qJson = await qRes.json()
    if (qJson.status === 'not_indexed' || !(qJson.docCount > 0)) {
      fail(`QUERY ${label} ${origin} — expected indexed docs, got status=${qJson.status} docCount=${qJson.docCount}`)
    }
    console.log(`smoke-production: QUERY ${label} OK docCount=${qJson.docCount}`)
  }

  // Relay-backed chat index (chat/public branch)
  {
    const chatOrigin = CHAT_MIRROR.replace(/\/$/, '')
    const chatRes = await fetch(`${chatOrigin}/`, {
      method: 'QUERY',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-relay-branch': 'chat/public',
      },
      body: JSON.stringify({ collection: 'chat', query: 'general', limit: 5 }),
    })
    if (!chatRes.ok) {
      fail(`QUERY chat ${chatOrigin} — expected HTTP 200, got ${chatRes.status}`)
    }
    const chatJson = await chatRes.json()
    if (chatJson.status === 'not_indexed' || !(chatJson.docCount > 0)) {
      fail(
        `QUERY chat ${chatOrigin} — expected indexed docs, got status=${chatJson.status} docCount=${chatJson.docCount}`,
      )
    }
    if (!(chatJson.tookMs < 2000)) {
      fail(`QUERY chat ${chatOrigin} — expected tookMs < 2000 (fresh index), got ${chatJson.tookMs}`)
    }
    console.log(
      `smoke-production: QUERY chat OK docCount=${chatJson.docCount} tookMs=${chatJson.tookMs}`,
    )

    const channelsRes = await fetch(`${chatOrigin}/.relay/chat/channels.json`, {
      headers: { 'x-relay-branch': 'chat/public' },
    })
    if (!channelsRes.ok) {
      fail(`${chatOrigin}/.relay/chat/channels.json — expected 200, got ${channelsRes.status}`)
    }

    const chatPage = await fetch(`${BASE}/chat`)
    if (!chatPage.ok) {
      fail(`${BASE}/chat — expected HTTP 200, got ${chatPage.status}`)
    }
    const chatHtml = await chatPage.text()
    if (!/Relay public chat|Channel:\s*general|Write a message/i.test(chatHtml)) {
      fail(`${BASE}/chat — expected Relay chat UI markers in HTML`)
    }

    const legacyChat = await fetch(`${BASE}/api/chat/getChannels`)
    const legacyCt = (legacyChat.headers.get('content-type') || '').toLowerCase()
    if (legacyChat.ok && legacyCt.includes('application/json')) {
      fail(
        `${BASE}/api/chat/getChannels — legacy JSON chat API still live (expected 404 or SPA HTML catch-all)`,
      )
    }
    console.log(
      `smoke-production: legacy /api/chat gone (status=${legacyChat.status}, content-type=${legacyCt.split(';')[0] || 'n/a'})`,
    )
  }

  await expectHead(
    `${FILES_MIRROR}/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation.png?w=400`,
    { contentTypeIncludes: 'image/' },
  )

  for (const piperBase of piperBases()) {
    const voicesUrl = `${piperBase}/voices`
    const voicesRes = await fetch(voicesUrl)
    if (!voicesRes.ok) {
      fail(`${voicesUrl} — expected HTTP 200, got ${voicesRes.status}`)
    }
    const voicesJson = await voicesRes.json()
    if (!Array.isArray(voicesJson.voices) || voicesJson.voices.length < 1) {
      fail(`${voicesUrl} — expected non-empty voices[]`)
    }
    console.log('smoke-production: Piper voices OK on', piperBase)
  }

  await expectHead(
    `${FILES_MIRROR}/influence/conspiracy/embedding.jpg?w=360`,
    { contentTypeIncludes: 'image/' },
  )

  const articlePath =
    '/events/false_flag/investigations/richard-gage-ae911truth-controlled-demolition-investigation'
  const articleUrl = `${BASE}${articlePath}`
  const articleProbe = await fetch(articleUrl, { redirect: 'manual' })
  if ([307, 308].includes(articleProbe.status)) {
    fail(
      `${articleUrl} — articles must stay on ${BASE} (client shell), got redirect ${articleProbe.headers.get('location')}`,
    )
  }
  const articleCacheControl = articleProbe.headers.get('cache-control') || ''
  const cdnCacheControl =
    articleProbe.headers.get('cdn-cache-control') ||
    articleProbe.headers.get('CDN-Cache-Control') ||
    ''
  const hasEdgeCache =
    /s-maxage=\d+/i.test(articleCacheControl) || /s-maxage=\d+/i.test(cdnCacheControl)
  if (!hasEdgeCache) {
    fail(
      `${articleUrl} — expected Cache-Control or CDN-Cache-Control with s-maxage, got cache-control="${articleCacheControl || '(none)'}" cdn="${cdnCacheControl || '(none)'}"`,
    )
  }
  console.log(
    'smoke-production: article cache headers OK —',
    (cdnCacheControl || articleCacheControl).slice(0, 80),
  )
  const articleProbe2 = await fetch(articleUrl, { redirect: 'manual' })
  const vercelCache = articleProbe2.headers.get('x-vercel-cache') || '(none)'
  console.log('smoke-production: article x-vercel-cache (2nd request) —', vercelCache)
  if (vercelCache !== 'HIT' && vercelCache !== 'STALE') {
    console.log('smoke-production: note — CDN may need warm-up; check Observability if MISS persists')
  }
  const articleHtml = await fetch(articleUrl, { redirect: 'follow' }).then((r) => {
    if (!r.ok) fail(`${articleUrl} — expected HTTP 200, got ${r.status}`)
    return r.text()
  })
  if (!/Paradigm Threat/i.test(articleHtml)) {
    fail(`${articleUrl} — expected Next app shell in HTML`)
  }
  const ogImage = extractMeta(articleHtml, 'og:image')
  if (ogImage) {
    assertRelayOg(ogImage, articleUrl)
    await expectHead(ogImage, { contentTypeIncludes: 'image/' })
  } else {
    console.log('smoke-production: article has no server og:image (client load — OK)')
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

  const legacyTimelineRaster =
    `${BASE}/files/timeline/media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png`
  const legacyTimelineHead = await fetch(legacyTimelineRaster, { method: 'HEAD', redirect: 'manual' })
  if (![307, 308].includes(legacyTimelineHead.status)) {
    fail(`${legacyTimelineRaster} — expected HTTP 307/308 redirect to timeline mirror, got ${legacyTimelineHead.status}`)
  }
  const legacyTimelineLoc = legacyTimelineHead.headers.get('location') || ''
  if (
    !legacyTimelineLoc.includes('relaygateway.net') ||
    !legacyTimelineLoc.includes('/media/15.ce-21st-the-final-struggle/15.08.00-historical-antibodies.png')
  ) {
    fail(`${legacyTimelineRaster} — expected timeline mirror redirect, got ${legacyTimelineLoc}`)
  }
  await expectHead(legacyTimelineLoc, { contentTypeIncludes: 'image/' })

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
    const timelineJsonRes = await fetch(`${BASE}/api/timeline-json`)
    if (timelineJsonRes.status !== 503) {
      fail(`${BASE}/api/timeline-json — expected HTTP 503 (client timeline), got ${timelineJsonRes.status}`)
    }
    const chatRes = await fetch(`${BASE}/api/chat/getChannels`)
    const chatCt = (chatRes.headers.get('content-type') || '').toLowerCase()
    if (chatRes.ok && chatCt.includes('application/json')) {
      fail(`${BASE}/api/chat/getChannels — legacy JSON chat API still live`)
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
