import {
  DEFAULT_SEARCH_CONTENT_FILTERS,
  type SearchContentFilters,
} from '@/lib/searchIndexFilter'

let currentFilters: SearchContentFilters = { ...DEFAULT_SEARCH_CONTENT_FILTERS }

export function getSearchFiltersState (): SearchContentFilters {
  return { ...currentFilters }
}

export function setSearchFiltersState (next: Partial<SearchContentFilters>): SearchContentFilters {
  currentFilters = {
    includeBlog: next.includeBlog ?? currentFilters.includeBlog,
    includeNonArticleMd: next.includeNonArticleMd ?? currentFilters.includeNonArticleMd,
  }
  return getSearchFiltersState()
}

export function resetSearchFiltersState (): void {
  currentFilters = { ...DEFAULT_SEARCH_CONTENT_FILTERS }
}
