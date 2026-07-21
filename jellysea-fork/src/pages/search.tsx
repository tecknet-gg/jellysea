import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import useSWRInfinite from 'swr/infinite'
import api from '@app/utils/api'
import Header from '@app/components/Common/Header'
import TitleCard from '@app/components/Common/TitleCard'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import type { DiscoverResponse, MovieResult, TvResult } from '@app/utils/types'

type MixedResult = MovieResult | TvResult

const PAGE_SIZE = 20
type Tab = 'all' | 'movie' | 'tv'

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Series' },
]

export default function SearchPage() {
  const router = useRouter()
  const { query: searchQuery } = router.query
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const query = typeof searchQuery === 'string' ? searchQuery : ''

  const getKey = (pageIndex: number, previousPageData: DiscoverResponse<MixedResult> | null) => {
    if (!query) return null
    if (previousPageData && previousPageData.results.length < PAGE_SIZE) return null
    return `/search?query=${encodeURIComponent(query)}&page=${pageIndex + 1}`
  }

  const { data, error, size, setSize } = useSWRInfinite<DiscoverResponse<MixedResult>>(
    getKey,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const isLoadingInitial = !data && !error
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined'
  const isReachingEnd = data ? data[data.length - 1]?.results.length < PAGE_SIZE : false
  const totalResults = data?.[0]?.totalResults ?? 0
  const titles = useMemo(() => (data ? data.flatMap((page) => page.results) : []), [data])

  const movies = useMemo(() => titles.filter((item) => item.mediaType === 'movie') as MovieResult[], [titles])
  const tvShows = useMemo(() => titles.filter((item) => item.mediaType === 'tv') as TvResult[], [titles])

  const filteredTitles = useMemo(() => {
    if (activeTab === 'movie') return movies
    if (activeTab === 'tv') return tvShows
    return titles
  }, [activeTab, movies, tvShows, titles])

  const tabCounts = useMemo(() => ({
    all: titles.length,
    movie: movies.length,
    tv: tvShows.length,
  }), [titles.length, movies.length, tvShows.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          setSize(size + 1)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [setSize, size, isLoadingMore, isReachingEnd])

  if (!query) {
    return (
      <div className="mt-32 text-center text-2xl text-slate-400">
        Enter a search term to find movies and series.
      </div>
    )
  }

  if (isLoadingInitial) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="mt-32 text-center">
        <Header>Search</Header>
        <p className="mt-4 text-lg text-red-400">
          Failed to load search results. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Header>
          Search results for &quot;{query}&quot;
          {totalResults > 0 && (
            <span className="ml-2 text-lg font-normal text-slate-400">
              &mdash; {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </Header>
      </div>

      {titles.length > 0 && (
        <div className="mb-6 flex gap-1 rounded-lg bg-dark-800 p-1">
          {tabs.map((tab) => {
            const count = tabCounts[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-dark-600 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {filteredTitles.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-slate-400">
            {activeTab === 'all'
              ? `No results found for "${query}"`
              : `No ${activeTab === 'movie' ? 'movies' : 'TV series'} found for "${query}"`}
          </p>
        </div>
      ) : (
        <ul className="cards-vertical grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9.375rem, 1fr))' }}>
          {filteredTitles.map((item) => {
            const isMovie = item.mediaType === 'movie'
            const movieItem = item as MovieResult
            const tvItem = item as TvResult
            return (
              <li key={`${item.mediaType}-${item.id}`}>
                <TitleCard
                  id={item.id}
                  image={item.posterPath}
                  title={isMovie ? movieItem.title : tvItem.name}
                  year={isMovie ? movieItem.releaseDate?.split('-')[0] : tvItem.firstAirDate?.split('-')[0]}
                  userScore={item.voteAverage}
                  mediaType={isMovie ? 'movie' : 'tv'}
                  status={item.mediaInfo?.status}
                  canExpand
                />
              </li>
            )
          })}
        </ul>
      )}

      {isLoadingMore && (
        <div className="mt-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  )
}
