import { cache } from 'react'
import { markdownToSeoHtml } from '@/lib/seo/markdownToSeoHtml'
import { fetchChangelogSeoEntries, renderChangelogSeoHtml } from '@/lib/seo/fetchChangelogSeo'
import { fetchFilesHtmlFromMirrors, fetchFilesTextFromMirrors } from '@/lib/serverFilesMirror'
import { fetchFromAssetMirrors } from '@/lib/remoteAssetMirrors'
import { rewriteSeoHtmlRasterImages } from '@/lib/seo/rewriteSeoHtmlRasterImages'
import { parseDeadUrlMap, type DeadUrlMap } from '@/lib/normalizeHttpHref'

export interface BuildArticleSeoHtmlInput {
  markdownBody: string
  basePath: string
  includeChangelog?: boolean
  /** Repo-relative article path (e.g. `cosmos/mars/page.md`) for relay static HTML fetch. */
  articlePath?: string
}

const CHANGELOG_TAG_RE =
  /<p>\s*(?:&lt;|<)ChangeLog\s*\/?>(?:&gt;|>)\s*<\/p>|(?:&lt;|<)ChangeLog\s*\/?>(?:&gt;|>)/gi

/** Replace escaped/raw `<ChangeLog />` text from relay md2ast with rendered changelog HTML. */
function injectRelayChangelog (html: string, changelogHtml: string | undefined): string {
  let out = html.replace(CHANGELOG_TAG_RE, '')
  if (!changelogHtml) return out

  if (out.includes('data-relay-changelog')) return out

  const h2 = out.match(/<h2[^>]*id="change_log"[^>]*>/i)
  if (h2 && typeof h2.index === 'number') {
    return `${out.slice(0, h2.index)}<section class="relay-changelog-seo" data-relay-changelog="true">${changelogHtml}</section>${out.slice(h2.index)}`
  }

  return out.replace(
    /<\/article>\s*$/i,
    `<section class="relay-changelog-seo" data-relay-changelog="true">${changelogHtml}</section></article>`,
  )
}

const loadSeoDeadUrls = cache(async function loadSeoDeadUrls (): Promise<DeadUrlMap> {
  let filesMap: DeadUrlMap = {}
  let timelineMap: DeadUrlMap = {}
  try {
    const filesText = await fetchFilesTextFromMirrors('hooks/dead-urls.json', '')
    filesMap = parseDeadUrlMap(filesText)
  } catch {
    filesMap = {}
  }
  try {
    const res = await fetchFromAssetMirrors('timeline', '/hooks/dead-urls.json', { search: '' })
    if (res) {
      timelineMap = parseDeadUrlMap(await res.text())
    }
  } catch {
    timelineMap = {}
  }
  return { ...filesMap, ...timelineMap }
})

export const buildArticleSeoHtml = cache(async function buildArticleSeoHtml ({
  markdownBody,
  basePath,
  includeChangelog,
  articlePath,
}: BuildArticleSeoHtmlInput): Promise<string> {
  const needsChangelog = includeChangelog ?? /<ChangeLog\s*\/>/i.test(markdownBody)
  let changelogHtml: string | undefined
  if (needsChangelog) {
    const entries = await fetchChangelogSeoEntries()
    changelogHtml = renderChangelogSeoHtml(entries)
  }

  if (articlePath?.toLowerCase().endsWith('.md')) {
    const relayHtml = await fetchFilesHtmlFromMirrors(articlePath)
    if (relayHtml) {
      let html = rewriteSeoHtmlRasterImages(relayHtml, basePath)
      html = injectRelayChangelog(html, changelogHtml)
      return html
    }
  }

  const deadUrls = await loadSeoDeadUrls()
  return markdownToSeoHtml(markdownBody, { basePath, changelogHtml, deadUrls })
})
