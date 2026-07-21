import { useState, useMemo, useEffect } from 'react'
import { BarsArrowDownIcon, FunnelIcon } from '@heroicons/react/24/outline'
import useSWR from 'swr'
import { useRouter } from 'next/router'
import api from '@/utils/api'
import { useDiscover } from '@/hooks/useDiscover'
import Header from '@/components/Common/Header'
import ListView from '@/components/Common/ListView'
import FilterSlideover, { countActiveFilters } from '@/components/Discover/FilterSlideover'
import type { TvResult, Genre, DiscoverFiltersState } from '@/utils/types'

export default function DiscoverTv() {
  const router = useRouter()
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    sortBy: 'popularity.desc',
    genre: '',
    studio: '',
    network: '',
    yearGte: '',
    yearLte: '',
    status: '',
    voteAverageGte: '',
    voteAverageLte: '',
    voteCountGte: '',
    voteCountLte: '',
    keywords: '',
    excludeKeywords: '',
    language: '',
    runtimeGte: '',
    runtimeLte: '',
    certification: '',
    certificationCountry: 'US',
    watchProviders: '',
    watchRegion: '',
    tvStatus: '',
  })

  useEffect(() => {
    if (!router.isReady) return
    const genre = router.query.genre as string
    const keywords = router.query.keywords as string
    const update: Partial<DiscoverFiltersState> = {}
    if (genre && genre !== filters.genre) update.genre = genre
    if (keywords && keywords !== filters.keywords) update.keywords = keywords
    if (Object.keys(update).length > 0) {
      setFilters((prev) => ({ ...prev, ...update }))
    }
  }, [router.isReady, router.query.genre, router.query.keywords])

  const { data: genres } = useSWR<Genre[]>(
    '/genres/tv',
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const apiParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      sortBy: filters.sortBy,
    }
    if (filters.genre) params.genre = filters.genre
    if (filters.network) params.network = filters.network
    if (filters.yearGte) params.firstAirDateGte = `${filters.yearGte}-01-01`
    if (filters.yearLte) params.firstAirDateLte = `${filters.yearLte}-12-31`
    if (filters.voteAverageGte) params.voteAverageGte = filters.voteAverageGte
    if (filters.voteAverageLte) params.voteAverageLte = filters.voteAverageLte
    if (filters.voteCountGte) params.voteCountGte = filters.voteCountGte
    if (filters.voteCountLte) params.voteCountLte = filters.voteCountLte
    if (filters.keywords) params.keywords = filters.keywords
    if (filters.excludeKeywords) params.excludeKeywords = filters.excludeKeywords
    if (filters.language) params.language = filters.language
    if (filters.runtimeGte) params.withRuntimeGte = filters.runtimeGte
    if (filters.runtimeLte) params.withRuntimeLte = filters.runtimeLte
    if (filters.certification) params.certification = filters.certification
    if (filters.certificationCountry) params.certificationCountry = filters.certificationCountry
    if (filters.watchProviders) params.watchProviders = filters.watchProviders
    if (filters.watchRegion) params.watchRegion = filters.watchRegion
    if (filters.tvStatus) params.status = filters.tvStatus
    return params
  }, [filters])

  const { titles, isLoading, isLoadingMore, isReachingEnd, isEmpty, fetchMore } =
    useDiscover<TvResult>('/discover/tv', apiParams)

  const filteredTitles = useMemo(() => {
    if (!filters.status || !titles) return titles
    return titles.filter((item) => {
      const status = item.mediaInfo?.status
      switch (filters.status) {
        case 'available':
          return status === 5
        case 'partial':
          return status === 4
        case 'processing':
          return status === 3
        case 'pending':
          return status === 2
        default:
          return true
      }
    })
  }, [titles, filters.status])

  const activeCount = countActiveFilters(filters)

  const sortOptions = [
    { value: 'popularity.desc', label: 'Popularity Descending' },
    { value: 'popularity.asc', label: 'Popularity Ascending' },
    { value: 'first_air_date.desc', label: 'First Air Date Descending' },
    { value: 'first_air_date.asc', label: 'First Air Date Ascending' },
    { value: 'vote_average.desc', label: 'TMDB Rating Descending' },
    { value: 'vote_average.asc', label: 'TMDB Rating Ascending' },
    { value: 'name.asc', label: 'Title (A-Z)' },
    { value: 'name.desc', label: 'Title (Z-A)' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between">
        <Header>Series</Header>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex items-center gap-2 rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-slate-300 hover:bg-dark-700"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-dark-500 bg-dark-900 px-3 text-slate-400">
              <BarsArrowDownIcon className="h-5 w-5" />
            </span>
            <select
              id="sortBy"
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="rounded-r-only block w-full rounded-r-md border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <ListView
        items={filteredTitles}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        isReachingEnd={isReachingEnd}
        isEmpty={isEmpty}
        fetchMore={fetchMore}
      />
      <FilterSlideover
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
        initialFilters={filters}
        mediaType="tv"
        genres={genres || []}
      />
    </div>
  )
}