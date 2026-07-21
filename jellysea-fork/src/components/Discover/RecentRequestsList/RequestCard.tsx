import useSWR from 'swr'
import api from '@app/utils/api'
import CachedImage from '@app/components/Common/CachedImage'
import StatusBadge from '@app/components/JellyseaStatusBadge'
import type { MediaRequest, MediaStatus } from '@app/utils/types'

interface RequestCardProps {
  request: MediaRequest
}

interface MovieDetails {
  id: number
  title: string
  posterPath?: string
  backdropPath?: string
  overview?: string
  voteAverage?: number
  releaseDate?: string
}

interface TvDetails {
  id: number
  name: string
  posterPath?: string
  backdropPath?: string
  overview?: string
  voteAverage?: number
  firstAirDate?: string
  seasons?: { id: number; seasonNumber: number; episodeCount: number }[]
}

const isMovie = (data: MovieDetails | TvDetails): data is MovieDetails =>
  'title' in data

function RequestCardPlaceholder() {
  return (
    <div className="relative flex w-72 animate-pulse rounded-xl bg-dark-700 p-4 sm:w-96">
      <div className="flex-1 pr-4">
        <div className="mb-2 h-4 w-12 rounded bg-dark-700" />
        <div className="mb-2 h-5 w-40 rounded bg-dark-700" />
        <div className="mb-1 h-4 w-32 rounded bg-dark-700" />
        <div className="mt-4 h-6 w-24 rounded-full bg-dark-700" />
      </div>
      <div className="w-20 sm:w-28">
        <div className="w-full" style={{ paddingBottom: '150%' }} />
      </div>
    </div>
  )
}

function RequestCardError() {
  return (
    <div className="relative flex w-72 overflow-hidden rounded-xl bg-dark-900 p-4 text-slate-400 shadow ring-1 ring-red-500 sm:w-96">
      <div className="flex items-center justify-center text-sm font-medium">
        Media Not Found
      </div>
    </div>
  )
}

export default function RequestCard({ request }: RequestCardProps) {
  const tmdbId = request.media?.tmdbId
  const mediaType =
    request.type || (request.media?.mediaType as 'movie' | 'tv' | undefined)

  const endpoint = mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const { data: title, error } = useSWR<MovieDetails | TvDetails>(
    tmdbId && mediaType ? endpoint : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (!title && !error) {
    return <RequestCardPlaceholder />
  }

  if (!title || error) {
    return <RequestCardError />
  }

  const mediaStatus = request.media?.status
  const year = isMovie(title)
    ? title.releaseDate?.slice(0, 4)
    : title.firstAirDate?.slice(0, 4)

  return (
    <div
      className="relative flex w-72 overflow-hidden rounded-xl bg-dark-900 bg-cover bg-center p-4 text-slate-400 shadow ring-1 ring-dark-600 sm:w-96"
    >
      {title.backdropPath && (
        <div className="absolute inset-0 z-0">
          <CachedImage
            type="tmdb"
            src={title.backdropPath ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(8, 12, 24, 0.47) 0%, rgba(8, 12, 24, 1) 75%)',
            }}
          />
        </div>
      )}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pr-4">
        {year && (
          <div className="hidden text-xs font-medium text-white sm:flex">
            {year}
          </div>
        )}
        <a
          href={
            mediaType === 'movie'
              ? `/movie/${tmdbId}`
              : `/tv/${tmdbId}`
          }
          className="overflow-hidden overflow-ellipsis whitespace-nowrap text-base font-bold text-white hover:underline sm:text-lg"
        >
          {isMovie(title) ? title.title : title.name}
        </a>
        {request.requestedBy && (
          <div className="mt-1 flex items-center gap-1.5">
            <CachedImage
              type="avatar"
              src={request.requestedBy.avatar ?? ""}
              alt={request.requestedBy.displayName}
              className="h-5 w-5 flex-shrink-0 rounded-full object-cover"
            />
            <span className="truncate text-sm font-semibold text-slate-300">
              {request.requestedBy.displayName}
            </span>
          </div>
        )}
        {!isMovie(title) &&
          title.seasons &&
          title.seasons.length > 0 && (
            <div className="my-0.5 hidden items-center text-sm sm:my-1 sm:flex">
              {request.seasons && request.seasons.length > 0 && (
                <>
                  <span className="mr-2 font-bold text-slate-300">
                    {request.seasons.length === title.seasons.length
                      ? 'All Seasons'
                      : `${request.seasons.length} Season${request.seasons.length > 1 ? 's' : ''}`}
                  </span>
                  <div className="hide-scrollbar flex gap-1 overflow-x-scroll">
                    {request.seasons.map((season) => (
                      <span
                        key={`season-${season.id}`}
                        className="inline-flex items-center rounded-full bg-dark-800 px-2 py-0.5 text-xs font-semibold text-slate-200"
                      >
                        {season.seasonNumber === 0
                          ? 'Specials'
                          : season.seasonNumber}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        <div className="mt-2 flex items-center text-sm sm:mt-1">
          <span className="mr-2 hidden font-bold text-slate-300 sm:block">
            Status
          </span>
          <StatusBadge
            status={mediaStatus}
            is4k={request.is4k}
            tmdbId={tmdbId}
            mediaType={mediaType}
            title={isMovie(title) ? title.title : title.name}
          />
        </div>
      </div>
      <a
        href={
          mediaType === 'movie'
            ? `/movie/${tmdbId}`
            : `/tv/${tmdbId}`
        }
        className="w-20 flex-shrink-0 scale-100 transform-gpu cursor-pointer overflow-hidden rounded-md shadow-sm transition duration-300 hover:scale-105 hover:shadow-md sm:w-28"
      >
        <CachedImage
          type="tmdb"
          src={title.posterPath ?? ""}
          alt=""
          className="w-full"
          style={{ aspectRatio: '600/900' }}
        />
      </a>
    </div>
  )
}
