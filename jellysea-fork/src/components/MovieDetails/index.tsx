import usePlaybackProgress from '@app/hooks/usePlaybackProgress'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useSWR from 'swr'
import api from '@app/utils/api'
import CachedImage from '@app/components/Common/CachedImage'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import StatusBadge from '@app/components/JellyseaStatusBadge'
import RequestButton from '@app/components/RequestButton'
import PlayButton from '@app/components/PlayButton'
import Slider from '@app/components/Common/Slider'
import MediaSlider from '@app/components/Common/MediaSlider'
import TitleCard from '@app/components/Common/TitleCard'
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  CogIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  PlayIcon,
  TicketIcon,
} from '@heroicons/react/24/outline'
import { ChevronDoubleDownIcon, ChevronDoubleUpIcon } from '@heroicons/react/24/solid'
import { MediaStatus } from '@app/utils/types'
import { useUser, Permission } from '@app/hooks/useUser'
import type { MovieDetails as MovieDetailsType, RatingResponse, Cast, Crew } from '@app/utils/types'

function RtFreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <ellipse cx="12" cy="13" rx="8" ry="7" fill="#fa320a" />
      <path d="M12 4c-1.5 1-3 3-3 5s1.5 3 3 2 3-1 3-3-1.5-4-3-4z" fill="#4caf50" />
      <path d="M12 6c-1 1.5-1.5 3-.5 4s2 .5 2.5-1-.5-3.5-2-3z" fill="#66bb6a" />
      <path d="M10 3c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2z" fill="#4caf50" />
      <path d="M11 3c0 .5.5 1 1 1s1-.5 1-1-.5-1-1-1-1 .5-1 1z" fill="#66bb6a" />
      <ellipse cx="12" cy="13" rx="7" ry="6" fill="#fa320a" />
      <ellipse cx="12" cy="13" rx="5" ry="4.5" fill="#e53935" />
      <path d="M8 13c0 2 4 3 4 0s-4-2-4 0z" fill="#ff6f00" opacity="0.3" />
      <path d="M16 13c0 2-4 3-4 0s4-2 4 0z" fill="#ff6f00" opacity="0.3" />
    </svg>
  )
}

function RtRottenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <ellipse cx="12" cy="13" rx="8" ry="7" fill="#fa320a" />
      <path d="M12 4c-1.5 1-3 3-3 5s1.5 3 3 2 3-1 3-3-1.5-4-3-4z" fill="#4caf50" />
      <path d="M12 6c-1 1.5-1.5 3-.5 4s2 .5 2.5-1-.5-3.5-2-3z" fill="#66bb6a" />
      <path d="M10 3c0 1 1 2 2 2s2-1 2-2-1-2-2-2-2 1-2 2z" fill="#4caf50" />
      <path d="M11 3c0 .5.5 1 1 1s1-.5 1-1-.5-1-1-1-1 .5-1 1z" fill="#66bb6a" />
      <ellipse cx="12" cy="13" rx="7" ry="6" fill="#fa320a" />
      <path d="M12 9c2 0 3 2 3 4s-1 2-3 0-3-1-3-3 1-1 3-1z" fill="#e53935" />
      <path d="M7 10s1 3 3 3 2-2 1-3-4-2-4 0z" fill="#ff9800" opacity="0.3" />
      <path d="M17 10s-1 3-3 3-2-2-1-3 4-2 4 0z" fill="#ff9800" opacity="0.3" />
      <circle cx="9" cy="12" r="1.5" fill="#fff9c4" opacity="0.6" />
      <circle cx="15" cy="12" r="1.5" fill="#fff9c4" opacity="0.6" />
      <path d="M8 15s2 1 4 0 4 0 4 0" stroke="#fff9c4" strokeWidth="0.5" opacity="0.5" />
    </svg>
  )
}

function RtAudFreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect x="7" y="10" width="10" height="10" rx="2" fill="#fa320a" />
      <rect x="7" y="10" width="10" height="3" rx="1" fill="#c62828" />
      <circle cx="12" cy="14" r="2" fill="#ffcdd2" />
      <circle cx="12" cy="14" r="1" fill="#fa320a" />
      <rect x="10" y="6" width="4" height="4" rx="1" fill="#ff8f00" />
      <path d="M11 7l1 1-1 1" stroke="#fff9c4" strokeWidth="0.5" />
    </svg>
  )
}

function RtAudRottenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <rect x="7" y="10" width="10" height="10" rx="2" fill="#fa320a" />
      <rect x="7" y="10" width="10" height="3" rx="1" fill="#c62828" />
      <path d="M9 14c2 2 4 0 6-2" stroke="#ffcdd2" strokeWidth="1" strokeLinecap="round" />
      <path d="M9 17c2-1 4-3 6-1" stroke="#ffcdd2" strokeWidth="1" strokeLinecap="round" />
      <circle cx="9.5" cy="15" r="0.8" fill="#fff9c4" opacity="0.6" />
      <circle cx="14.5" cy="14" r="0.8" fill="#fff9c4" opacity="0.6" />
      <rect x="10" y="6" width="4" height="4" rx="1" fill="#ff8f00" />
      <path d="M11 7l1 1-1 1" stroke="#fff9c4" strokeWidth="0.5" />
    </svg>
  )
}

const JOB_PRIORITY: Record<string, number> = {
  Director: 1,
  Screenplay: 2,
  Writer: 3,
  Story: 4,
  'Executive Producer': 5,
  Producer: 6,
  Music: 7,
  'Director of Photography': 8,
}

function sortCrewPriority(crew: Crew[]): Crew[] {
  return [...crew].sort((a, b) => {
    const pa = JOB_PRIORITY[a.job] ?? 99
    const pb = JOB_PRIORITY[b.job] ?? 99
    if (pa !== pb) return pa - pb
    return a.order ?? 99 - (b.order ?? 99)
  })
}

function CastCard({ person }: { person: Cast }) {
  return (
    <div className="w-32 flex-shrink-0">
      <CachedImage
        type="tmdb"
        src={person.profilePath ?? ""}
        alt={person.name}
        className="w-32 rounded-lg"
        style={{ aspectRatio: '276/350' }}
      />
      <div className="mt-1.5 truncate text-sm font-semibold text-white">
        {person.name}
      </div>
      <div className="truncate text-xs text-slate-400">
        {person.character}
      </div>
    </div>
  )
}

function MediaFactsSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-24 rounded bg-dark-700" />
      <div className="h-4 w-32 rounded bg-dark-700" />
      <div className="h-4 w-20 rounded bg-dark-700" />
    </div>
  )
}

export default function MovieDetails() {
  const router = useRouter()
  const { movieId } = router.query
  const [requestUpdate, setRequestUpdate] = useState(0)
  const { loadProgress } = usePlaybackProgress()
  const { hasPermission } = useUser()

  const { data, error } = useSWR<MovieDetailsType>(
    movieId ? `/movie/${movieId}` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const { data: ratingData } = useSWR<RatingResponse>(
    movieId ? `/movie/${movieId}/ratingscombined` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const sortedCrew = useMemo(
    () => (data?.credits.crew ? sortCrewPriority(data.credits.crew) : []),
    [data]
  )

  const [showMoreStudios, setShowMoreStudios] = useState(false)
  const minStudios = 3

  if (!data && !error) {
    return <LoadingSpinner />
  }

  if (!data) {
    return (
      <div className="mt-32 text-center text-2xl text-slate-400">
        Movie not found
      </div>
    )
  }

  const showAllStudios = data.productionCompanies.length <= minStudios + 1

  const certification = data.releaseDate
    ? undefined
    : undefined

  const movieAttributes: React.ReactNode[] = []

  if (certification) {
    movieAttributes.push(
      <span className="rounded-md border border-slate-500 px-1 py-0.5 text-xs font-semibold">
        {certification}
      </span>
    )
  }

  if (data.runtime) {
    movieAttributes.push(<span>{data.runtime} minutes</span>)
  }

  if (data.genres.length) {
    movieAttributes.push(
      <span>
        {data.genres.map((g, i) => (
          <span key={g.id}>
            <Link
              href={`/discover/movies?genre=${g.id}`}
              className="hover:underline"
            >
              {g.name}
            </Link>
            {i < data.genres.length - 1 && ', '}
          </span>
        ))}
      </span>
    )
  }

  const trailerUrl = data.relatedVideos
    ?.filter((r) => r.type === 'Trailer')
    .sort((a, b) => a.size - b.size)
    .pop()?.url

  return (
    <div className="media-page">
      {data.backdropPath && (
        <div className="media-page-bg-image relative" style={{ height: 493 }}>
          <CachedImage
            type="tmdb"
            src={data.backdropPath ?? ""}
            alt=""
            fill
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(0, 0, 0, 0.47) 0%, rgba(0, 0, 0, 1) 100%)',
            }}
          />
        </div>
      )}

      <div className="-mt-72 relative z-10 mx-auto max-w-8xl px-4">
        <div className="mb-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="media-header flex flex-col gap-6 md:flex-row">
          <div className="media-title flex min-w-0 flex-1 flex-col justify-end">
            <div className="media-status mb-2 flex gap-2">
              <StatusBadge
                status={data.mediaInfo?.status}
                tmdbId={data.id}
                mediaType="movie"
                title={data.title}
              />
            </div>

            <h1 className="text-3xl font-bold text-white" data-testid="media-title">
              {data.title}{' '}
              {data.releaseDate && (
                <span className="text-2xl font-normal text-slate-400">
                  ({data.releaseDate.slice(0, 4)})
                </span>
              )}
            </h1>

            {movieAttributes.length > 0 && (
              <div className="media-attributes mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                {movieAttributes.map((attr, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-600">|</span>}
                    {attr}
                  </span>
                ))}
              </div>
            )}

            <div className="media-actions mt-4 flex items-center gap-2">
              {data.mediaInfo?.status === MediaStatus.AVAILABLE ? (
                <PlayButton
                  tmdbId={data.id}
                  mediaType="movie"
                  title={data.title}
                  posterPath={data.posterPath ?? undefined}
                  backdropPath={data.backdropPath ?? undefined}
                  resumePosition={loadProgress(data.id, 'movie')?.position}
                  className="flex-shrink-0"
                />
              ) : (
                <RequestButton
                  tmdbId={data.id}
                  mediaType="movie"
                  media={data.mediaInfo as never}
                  onUpdate={() => setRequestUpdate((v) => v + 1)}
                />
              )}
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {trailerUrl && (
                  <a
                    href={trailerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-dark-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-dark-500"
                  >
                    <FilmIcon className="h-4 w-4" />
                    Trailer
                  </a>
                )}
                {data.homepage && (
                  <a
                    href={data.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-dark-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-dark-500"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Homepage
                  </a>
                )}
                {hasPermission(Permission.ADMIN) && (data.mediaInfo?.status === MediaStatus.AVAILABLE || data.mediaInfo?.status === MediaStatus.PARTIALLY_AVAILABLE) && (
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to permanently delete this media including all files?')) return;
                      if (!confirm('This action cannot be undone. Delete ' + data.title + '?')) return;
                      try {
                        await api.delete(`/media/${data.id}/delete`, { params: { mediaType: 'movie' } });
                        window.location.reload();
                      } catch {
                        alert('Failed to delete media');
                      }
                    }}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="media-overview mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="media-overview-left min-w-0 flex-1">
            {data.tagline && (
              <div className="tagline mb-4 text-lg font-semibold italic text-slate-400">
                {data.tagline}
              </div>
            )}

            <h2 className="mb-2 text-xl font-bold text-white">Overview</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {data.overview || 'Overview unavailable.'}
            </p>

            {sortedCrew.length > 0 && (
              <>
                <ul className="media-crew mt-6 space-y-1">
                  {sortedCrew.slice(0, 6).map((person) => (
                    <li
                      key={`crew-${person.job}-${person.id}`}
                      className="flex gap-2 text-sm"
                    >
                      <span className="text-slate-400">{person.job}</span>
                      <span className="font-semibold text-white">
                        {person.name}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end">
                  <span className="flex cursor-pointer items-center gap-1 text-sm text-slate-400 transition hover:text-white">
                    View Full Crew
                    <ArrowRightCircleIcon className="h-4 w-4" />
                  </span>
                </div>
              </>
            )}

            {data.keywords.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {data.keywords.map((keyword) => (
                  <Link
                    key={`keyword-${keyword.id}`}
                    href={`/discover/movies?keywords=${keyword.id}`}
                    className="inline-flex rounded-full bg-dark-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-dark-600"
                  >
                    {keyword.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="media-overview-right w-full lg:w-80 xl:w-96">
            <div className="media-facts space-y-4">
              {(ratingData?.rt || !!data.voteCount || ratingData?.imdb) && (
                <div className="media-ratings mb-4 flex flex-wrap gap-4">
                  {ratingData?.rt?.criticsRating &&
                    !!ratingData.rt.criticsScore && (
                      <a
                        href={ratingData.rt.url}
                        target="_blank"
                        rel="noreferrer"
                        className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                      >
                        {ratingData.rt.criticsRating === 'Rotten' ? <RtRottenIcon /> : <RtFreshIcon />}
                        <span className="font-semibold">
                          {ratingData.rt.criticsScore}%
                        </span>
                        <span className="text-xs text-slate-500">Tomatometer</span>
                      </a>
                    )}
                  {ratingData?.rt?.audienceRating &&
                    !!ratingData.rt.audienceScore && (
                      <a
                        href={ratingData.rt.url}
                        target="_blank"
                        rel="noreferrer"
                        className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                      >
                        {ratingData.rt.audienceRating === 'Spilled' ? <RtAudRottenIcon /> : <RtAudFreshIcon />}
                        <span className="font-semibold">
                          {ratingData.rt.audienceScore}%
                        </span>
                        <span className="text-xs text-slate-500">Audience</span>
                      </a>
                    )}
                  {ratingData?.imdb?.criticsScore && (
                    <a
                      href={ratingData.imdb.url}
                      target="_blank"
                      rel="noreferrer"
                      className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                    >
                      <span className="font-bold text-yellow-400">IMDb</span>
                      <span className="font-semibold">
                        {ratingData.imdb.criticsScore}
                      </span>
                    </a>
                  )}
                  {!!data.voteCount && (
                    <a
                      href={`https://www.themoviedb.org/movie/${data.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                    >
                      <span className="font-bold text-accent-400">TMDB</span>
                      <span className="font-semibold">
                        {Math.round(data.voteAverage * 10)}%
                      </span>
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {data.originalTitle &&
                  data.originalLanguage !== 'en' && (
                    <div className="media-fact flex justify-between gap-2 text-sm">
                      <span className="text-slate-400">Original Title</span>
                      <span className="text-right font-semibold text-white">
                        {data.originalTitle}
                      </span>
                    </div>
                  )}

                <div className="media-fact flex justify-between gap-2 text-sm">
                  <span className="text-slate-400">Status</span>
                  <span className="text-right font-semibold text-white">
                    {data.status}
                  </span>
                </div>

                {data.releaseDate && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Release Date</span>
                    <span className="text-right font-semibold text-white">
                      {new Date(data.releaseDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                  </div>
                )}

                {data.revenue > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Revenue</span>
                    <span className="text-right font-semibold text-white">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(data.revenue)}
                    </span>
                  </div>
                )}

                {data.budget > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Budget</span>
                    <span className="text-right font-semibold text-white">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(data.budget)}
                    </span>
                  </div>
                )}

                {data.originalLanguage && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Original Language</span>
                    <span className="text-right font-semibold text-white">
                      {data.originalLanguage.toUpperCase()}
                    </span>
                  </div>
                )}

                {data.productionCountries.length > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">
                      {data.productionCountries.length === 1
                        ? 'Country'
                        : 'Countries'}
                    </span>
                    <span className="text-right font-semibold text-white">
                      {data.productionCountries
                        .map((c) => c.name)
                        .join(', ')}
                    </span>
                  </div>
                )}

                {data.productionCompanies.length > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">
                      {data.productionCompanies.length === 1
                        ? 'Studio'
                        : 'Studios'}
                    </span>
                    <span className="text-right font-semibold text-white">
                      {data.productionCompanies
                        .slice(
                          0,
                          showAllStudios || showMoreStudios
                            ? data.productionCompanies.length
                            : minStudios
                        )
                        .map((s) => (
                          <span key={s.id} className="block">
                            {s.name}
                          </span>
                        ))}
                      {!showAllStudios && (
                        <button
                          type="button"
                          onClick={() => setShowMoreStudios(!showMoreStudios)}
                          className="mt-1 flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"
                        >
                          {showMoreStudios ? 'Show Less' : 'Show More'}
                          {showMoreStudios ? (
                            <ChevronDoubleUpIcon className="h-3 w-3" />
                          ) : (
                            <ChevronDoubleDownIcon className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </span>
                  </div>
                )}

                {data.watchProviders && data.watchProviders.length > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Streaming</span>
                    <span className="text-right font-semibold text-white">
                      {data.watchProviders
                        .slice(0, 3)
                        .map((p) => (
                          <span key={p.iso_3166_1} className="block">
                            {p.flatrate?.map((f) => f.name).join(', ') || 'N/A'}
                          </span>
                        ))}
                    </span>
                  </div>
                )}

                <div className="media-fact flex justify-between gap-2 text-sm">
                  <span className="text-slate-400">Links</span>
                  <span className="flex flex-wrap gap-2 text-right">
                    <a
                      href={`https://www.themoviedb.org/movie/${data.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-accent-400 hover:text-accent-300"
                    >
                      TMDB
                    </a>
                    {data.externalIds.imdbId && (
                      <a
                        href={`https://www.imdb.com/title/${data.externalIds.imdbId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-yellow-400 hover:text-yellow-300"
                      >
                        IMDb
                      </a>
                    )}
                    {data.externalIds.tvdbId && (
                      <a
                        href={`https://www.thetvdb.com/?id=${data.externalIds.tvdbId}&tab=series`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-400 hover:text-blue-300"
                      >
                        TVDB
                      </a>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {data.credits.cast.length > 0 && (
          <>
            <div className="slider-header mt-10 flex items-center justify-between">
              <div className="slider-title inline-flex items-center gap-2 text-xl font-bold text-slate-300">
                <span>Cast</span>
                <ArrowRightCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <Slider
              sliderKey="cast"
              isLoading={false}
              isEmpty={false}
              items={data.credits.cast.slice(0, 20).map((person) => (
                <CastCard key={`cast-${person.id}`} person={person} />
              ))}
            />
          </>
        )}

        <MediaSlider
          sliderKey="recommendations"
          title="Recommendations"
          url={`/movie/${router.query.movieId}/recommendations`}
          linkUrl={`/movie/${data.id}/recommendations`}
        />

        <MediaSlider
          sliderKey="similar"
          title="Similar Titles"
          url={`/movie/${router.query.movieId}/similar`}
          linkUrl={`/movie/${data.id}/similar`}
        />

        <div className="extra-bottom-space relative h-16" />
      </div>
    </div>
  )
}
