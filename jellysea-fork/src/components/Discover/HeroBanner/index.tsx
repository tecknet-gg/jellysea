import useSWR from 'swr'
import Link from 'next/link'
import CachedImage from '@app/components/Common/CachedImage'
import Badge from '@app/components/Common/Badge'
import { PlayIcon } from '@heroicons/react/24/solid'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { DiscoverResponse, MovieResult, TvResult } from '@app/utils/types'

export default function HeroBanner() {
  const { data, error } = useSWR<DiscoverResponse<MovieResult | TvResult>>(
    '/discover/trending?page=1',
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (!data?.results?.length || error) return null

  const hero = data.results[0]
  const isMovie = hero.mediaType === 'movie'
  const movieHero = hero as MovieResult
  const tvHero = hero as TvResult

  const title = isMovie ? movieHero.title : tvHero.name
  const year = isMovie
    ? movieHero.releaseDate?.split('-')[0]
    : tvHero.firstAirDate?.split('-')[0]
  const overview = hero.overview || ''
  const trimmedOverview = overview.length > 280 ? overview.slice(0, 280) + '...' : overview

  return (
    <div className="relative -mx-4 mb-8 overflow-hidden px-4">
      <div className="absolute inset-0">
        <CachedImage
          type="tmdb"
          src={hero.backdropPath ?? ''}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-900 via-midnight-900/70 to-midnight-900/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-900/90 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-h-[420px] items-end pb-8 pt-16">
        <div className="flex w-full flex-col gap-4 md:flex-row md:items-end">
          <div className="hidden w-44 flex-shrink-0 md:block">
            <CachedImage
              type="tmdb"
              src={hero.posterPath ?? ''}
              alt={title}
              className="w-full rounded-xl shadow-2xl shadow-black/50"
            />
          </div>

          <div className="flex flex-1 flex-col justify-end">
            <div className="flex items-center gap-2">
              <Badge badgeType="primary">
                {isMovie ? 'MOVIE' : 'SERIES'}
              </Badge>
              {year && (
                <span className="text-sm text-slate-400">{year}</span>
              )}
              {hero.voteAverage > 0 && (
                <span className="text-sm text-yellow-400">
                  {hero.voteAverage.toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="mt-2 text-3xl font-bold text-white md:text-5xl">
              {title}
            </h1>

            {trimmedOverview && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
                {trimmedOverview}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Link
                href={isMovie ? `/movie/${hero.id}` : `/tv/${hero.id}`}
                className="btn-primary"
              >
                <PlayIcon className="h-4 w-4" />
                View Details
              </Link>
              {isMovie && (
                <Link
                  href={`/movie/${hero.id}?request=true`}
                  className="btn-secondary"
                >
                  <ClockIcon className="h-4 w-4" />
                  Request
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
