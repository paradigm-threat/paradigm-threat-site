export { resolveOgImageUrl, extractFirstImageUrlFromMarkdown } from '@/lib/share/resolveOgImageUrl'
export * from '@/lib/share/platformLimits'
export { extractShareMetadata, type ShareExtractInput, type ShareExtractResult } from '@/lib/share/extractShareMetadata'
export {
  composeShareText,
  fitComposeShareToCharLimit,
  shareTextCharCount,
  effectiveLengthX,
  truncateShareTextForOutbound,
  platformUsesTruncatedOutboundIntent,
  platformUsesSeparateUrlInShareIntent,
  dedupeCanonicalUrlInPlainText,
  stripSnippetPrefixFromArticle,
  READ_FULL_ARTICLE_LINE,
  type ComposeShareInput,
  type FitComposeShareOptions,
} from '@/lib/share/composeShareText'
