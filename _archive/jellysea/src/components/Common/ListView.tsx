import { useEffect, useRef } from 'react'
import TitleCard from './TitleCard'
import type { MovieResult, TvResult } from '@/utils/types'

interface ListViewProps {
  items: (MovieResult | TvResult)[]
  isLoading: boolean
  isLoadingMore: boolean
  isReachingEnd: boolean
  isEmpty: boolean
  fetchMore: () => void
}

export default function ListView({ items, isLoading, isLoadingMore, isReachingEnd, isEmpty, fetchMore }: ListViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
          fetchMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchMore, isLoadingMore, isReachingEnd])

  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9.375rem, 1fr))' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-full">
            <div className="relative rounded-xl bg-dark-900" style={{ paddingBottom: '150%' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="mt-64 text-center text-2xl text-slate-400">
        No results found.
      </div>
    )
  }

  return (
    <ul className="cards-vertical grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(9.375rem, 1fr))' }}>
      {items?.map((item) => {
        const isMovie = item.mediaType === 'movie'
        const movieItem = item as MovieResult
        const tvItem = item as TvResult
        return (
          <li key={item.id}>
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
      {isLoadingMore && Array.from({ length: 4 }).map((_, i) => (
        <li key={`loading-${i}`}>
          <div className="w-full">
            <div className="relative rounded-xl bg-dark-900" style={{ paddingBottom: '150%' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
              </div>
            </div>
          </div>
        </li>
      ))}
      <div ref={sentinelRef} className="h-4" />
    </ul>
  )
}