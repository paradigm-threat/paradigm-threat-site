import {
  DEFAULT_SEARCH_CONTENT_FILTERS,
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'

export function searchContentFiltersFromInput (input: {
  includeBlog?: boolean
  includeSectionPages?: boolean
}): SearchContentFilters {
  return {
    includeBlog: input.includeBlog ?? DEFAULT_SEARCH_CONTENT_FILTERS.includeBlog,
    includeNonArticleMd: input.includeSectionPages ?? DEFAULT_SEARCH_CONTENT_FILTERS.includeNonArticleMd,
  }
}
