import { useEffect, useMemo, useState } from 'react'
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
import usePlaybackProgress from '@app/hooks/usePlaybackProgress'
import { Disclosure, Transition } from '@headlessui/react'
import {
  ArrowLeftIcon,
  ArrowRightCircleIcon,
  FilmIcon,
  PlayIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { MediaStatus } from '@app/utils/types'
import { useUser, Permission } from '@app/hooks/useUser'
import type { TvDetails as TvDetailsType, RTRating, Cast, Crew } from '@app/utils/types'

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

function EpisodeRow({ tvId, seasonNumber, episode, title }: { tvId: number; seasonNumber: number; episode: { episodeNumber: number; name: string; stillPath?: string; overview: string; airDate: string | null }; title: string }) {
  const { loadProgress } = usePlaybackProgress()
  return (
    <div className="flex gap-3 border-b border-dark-600 py-3 last:border-0">
      <div className="w-28 flex-shrink-0">
        <CachedImage
          type="tmdb"
          src={episode.stillPath ?? ""}
          alt={episode.name}
          className="w-28 rounded object-cover"
          style={{ aspectRatio: '300/200' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-slate-500">
            E{episode.episodeNumber}
          </span>
          <span className="truncate text-sm font-semibold text-white">
            {episode.name}
          </span>
          {episode.airDate && (
            <span className="ml-auto flex-shrink-0 text-xs text-slate-500">
              {new Date(episode.airDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </span>
          )}
          <PlayButton
            tmdbId={tvId}
            mediaType="tv"
            title={title}
            seasonNumber={seasonNumber}
            episodeNumber={episode.episodeNumber}
            size="sm"
            resumePosition={loadProgress(tvId, 'tv', seasonNumber, episode.episodeNumber)?.position}
          />
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
          {episode.overview || 'No episode overview available.'}
        </p>
      </div>
    </div>
  )
}

function SeasonPanel({ tvId, seasonNumber, title }: { tvId: number; seasonNumber: number; title: string }) {
  const { data, error } = useSWR(
    `/tv/${tvId}/season/${seasonNumber}`,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (!data && !error) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-accent-500 border-t-transparent" />
      </div>
    )
  }

  if (!data || error) {
    return (
      <div className="py-4 text-center text-sm text-slate-500">
        Failed to load episodes.
      </div>
    )
  }

  return (
    <div className="py-2">
      {data.episodes?.map((ep: { episodeNumber: number; name: string; stillPath?: string; overview: string; airDate: string | null }) => (
        <EpisodeRow key={`ep-${ep.episodeNumber}`} tvId={tvId} seasonNumber={seasonNumber} title={title} episode={ep} />
      ))}
    </div>
  )
}

export default function TvDetails() {
  const router = useRouter()
  const { tvId } = router.query
  const [requestUpdate, setRequestUpdate] = useState(0)
  const { loadProgress, loadLastEpisode } = usePlaybackProgress()
  const { hasPermission } = useUser()
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [defaultsApplied, setDefaultsApplied] = useState(false)

  const { data, error } = useSWR<TvDetailsType>(
    tvId ? `/tv/${tvId}` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const { data: ratingData } = useSWR<RTRating>(
    tvId ? `/tv/${tvId}/ratings` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const lastEpisode = data?.id ? loadLastEpisode(data.id) : null

  const { data: seasonEpisodes } = useSWR(
    data && tvId ? `/tv/${tvId}/season/${selectedSeason}` : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  useEffect(() => {
    if (defaultsApplied || !data || !lastEpisode) return
    const epProgress = loadProgress(data.id, 'tv', lastEpisode.seasonNumber, lastEpisode.episodeNumber)
    const isFinished = epProgress && epProgress.position > 0 && epProgress.duration > 0 &&
      epProgress.position >= epProgress.duration - 30

    if (isFinished) {
      const seasonInfo = data.seasons.find((s) => s.seasonNumber === lastEpisode.seasonNumber)
      if (seasonInfo && lastEpisode.episodeNumber < seasonInfo.episodeCount) {
        setSelectedSeason(lastEpisode.seasonNumber)
        setSelectedEpisode(lastEpisode.episodeNumber + 1)
      } else {
        const nextSeason = data.seasons
          .filter((s) => s.seasonNumber > 0 && s.episodeCount > 0)
          .find((s) => s.seasonNumber > (lastEpisode.seasonNumber ?? 0))
        if (nextSeason) {
          setSelectedSeason(nextSeason.seasonNumber)
          setSelectedEpisode(1)
        }
      }
    } else {
      setSelectedSeason(lastEpisode.seasonNumber)
      setSelectedEpisode(lastEpisode.episodeNumber)
    }
    setDefaultsApplied(true)
  }, [data, lastEpisode, defaultsApplied, loadProgress])

  const parsedEpisodes = (seasonEpisodes?.episodes ?? [])
    .filter((ep: { episodeNumber: number }) => ep.episodeNumber > 0)

  const sortedCrew = useMemo(
    () => (data?.credits.crew ? sortCrewPriority(data.credits.crew) : []),
    [data]
  )

  if (!data && !error) {
    return <LoadingSpinner />
  }

  if (!data) {
    return (
      <div className="mt-32 text-center text-2xl text-slate-400">
        Series not found
      </div>
    )
  }

  const seasonCount = data.seasons.filter(
    (s) => s.seasonNumber !== 0 && s.episodeCount !== 0
  ).length

  const seriesAttributes: React.ReactNode[] = []

  const contentRating = data.contentRatings.results.find(
    (r) => r.iso_3166_1 === 'US'
  )?.rating
  if (contentRating) {
    seriesAttributes.push(
      <span className="rounded-md border border-slate-500 px-1 py-0.5 text-xs font-semibold">
        {contentRating}
      </span>
    )
  }

  if (seasonCount) {
    seriesAttributes.push(
      <span>{seasonCount} Season{seasonCount > 1 ? 's' : ''}</span>
    )
  }

  if (data.genres.length) {
    seriesAttributes.push(
      <span>
        {data.genres.map((g, i) => (
          <span key={g.id}>
            <Link
              href={`/discover/tv?genre=${g.id}`}
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
          <img
            src={`https://image.tmdb.org/t/p/original${data.backdropPath}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
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
                mediaType="tv"
                title={data.name}
              />
            </div>

            <h1 className="text-3xl font-bold text-white" data-testid="media-title">
              {data.name}{' '}
              {data.firstAirDate && (
                <span className="text-2xl font-normal text-slate-400">
                  ({data.firstAirDate.slice(0, 4)})
                </span>
              )}
            </h1>

            {seriesAttributes.length > 0 && (
              <div className="media-attributes mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                {seriesAttributes.map((attr, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-600">|</span>}
                    {attr}
                  </span>
                ))}
              </div>
            )}

            <div className="media-actions mt-4 flex flex-nowrap items-center gap-2">
              {data.mediaInfo?.status === MediaStatus.AVAILABLE ? (
                <div className="flex flex-shrink-0 flex-nowrap items-center gap-2">
                  <select
                    value={selectedSeason}
                    onChange={(e) => {
                      setSelectedSeason(Number(e.target.value))
                      setSelectedEpisode(1)
                    }}
                    className="rounded-lg bg-dark-600 px-3 py-2 text-sm text-white border border-dark-500 flex-shrink-0"
                  >
                    {data.seasons
                      .filter((s) => s.seasonNumber > 0 && s.episodeCount > 0)
                      .map((s) => (
                        <option key={s.seasonNumber} value={s.seasonNumber}>
                          {s.name || `Season ${s.seasonNumber}`}
                        </option>
                      ))}
                  </select>
                  <select
                    value={selectedEpisode}
                    onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                    className="rounded-lg bg-dark-600 px-3 py-2 text-sm text-white border border-dark-500 max-w-[200px] flex-shrink-0"
                  >
                    {parsedEpisodes.map((ep: { episodeNumber: number; name: string }) => (
                      <option key={ep.episodeNumber} value={ep.episodeNumber}>
                        E{ep.episodeNumber} — {ep.name}
                      </option>
                    ))}
                  </select>
                  <PlayButton
                    tmdbId={data.id}
                    mediaType="tv"
                    title={data.name}
                    posterPath={data.posterPath ?? undefined}
                    backdropPath={data.backdropPath ?? undefined}
                    resumePosition={loadProgress(data.id, 'tv', selectedSeason, selectedEpisode)?.position}
                    seasonNumber={selectedSeason}
                    episodeNumber={selectedEpisode}
                  />
                </div>
              ) : (
                <RequestButton
                  tmdbId={data.id}
                  mediaType="tv"
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
                      if (!confirm('This action cannot be undone. Delete ' + data.name + '?')) return;
                      try {
                        await api.delete(`/media/${data.id}/delete`, { params: { mediaType: 'tv' } });
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
                  {(data.createdBy.length > 0
                    ? [
                        ...data.createdBy.map(
                          (person): Partial<Crew> => ({
                            id: person.id,
                            job: 'Creator',
                            name: person.name,
                          })
                        ),
                        ...sortedCrew,
                      ]
                    : sortedCrew
                  )
                    .slice(0, 6)
                    .map((person) => (
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
                    href={`/discover/tv?keywords=${keyword.id}`}
                    className="inline-flex rounded-full bg-dark-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-dark-600"
                  >
                    {keyword.name}
                  </Link>
                ))}
              </div>
            )}

            <h2 className="mb-4 mt-8 text-xl font-bold text-white">
              Seasons
            </h2>
            <div className="flex w-full flex-col space-y-2">
              {data.seasons
                .slice()
                .reverse()
                .map((season) => {
                  if (season.episodeCount === 0) return null

                  const mSeason = (data.mediaInfo?.seasons ?? []).find(
                    (s) => season.seasonNumber === s.seasonNumber
                  )

                  return (
                    <Disclosure key={`season-${season.seasonNumber}`}>
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            className={`flex w-full items-center justify-between space-x-2 border-dark-600 bg-dark-800 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-dark-700 ${
                              open
                                ? 'rounded-t-md border border-b-0'
                                : 'rounded-md border'
                            }`}
                          >
                            <div className="flex flex-1 items-center gap-2 text-sm font-semibold">
                              <span>
                                {season.seasonNumber === 0
                                  ? 'Specials'
                                  : `Season ${season.seasonNumber}`}
                              </span>
                              <span className="rounded bg-dark-600 px-1.5 py-0.5 text-xs font-normal text-slate-400">
                                {season.episodeCount} Episode
                                {season.episodeCount > 1 ? 's' : ''}
                              </span>
                            </div>
                            <ChevronDownIcon
                              className={`h-5 w-5 text-slate-500 transition ${
                                open ? 'rotate-180' : ''
                              }`}
                            />
                          </Disclosure.Button>
                          <Transition
                            show={open}
                            enter="transition-opacity duration-100 ease-out"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity duration-75 ease-out"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Disclosure.Panel className="w-full rounded-b-md border border-t-0 border-dark-600 px-4 pb-2">
                              <SeasonPanel
                                tvId={data.id}
                                seasonNumber={season.seasonNumber}
                                title={data.name}
                              />
                            </Disclosure.Panel>
                          </Transition>
                        </>
                      )}
                    </Disclosure>
                  )
                })}
            </div>
          </div>

          <div className="media-overview-right w-full lg:w-80 xl:w-96">
            <div className="media-facts space-y-4">
              {(ratingData?.criticsScore || !!data.voteCount) && (
                <div className="media-ratings mb-4 flex flex-wrap gap-4">
                  {ratingData?.criticsRating &&
                    !!ratingData.criticsScore && (
                      <a
                        href={ratingData.url}
                        target="_blank"
                        rel="noreferrer"
                        className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                      >
                        {ratingData.criticsRating === 'Rotten' ? <RtRottenIcon /> : <RtFreshIcon />}
                        <span className="font-semibold">
                          {ratingData.criticsScore}%
                        </span>
                        <span className="text-xs text-slate-500">Tomatometer</span>
                      </a>
                    )}
                  {ratingData?.audienceRating &&
                    !!ratingData.audienceScore && (
                      <a
                        href={ratingData.url}
                        target="_blank"
                        rel="noreferrer"
                        className="media-rating flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white"
                      >
                        {ratingData.audienceRating === 'Spilled' ? <RtAudRottenIcon /> : <RtAudFreshIcon />}
                        <span className="font-semibold">
                          {ratingData.audienceScore}%
                        </span>
                        <span className="text-xs text-slate-500">Audience</span>
                      </a>
                    )}
                  {!!data.voteCount && (
                    <a
                      href={`https://www.themoviedb.org/tv/${data.id}`}
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
                {data.originalName &&
                  data.originalLanguage !== 'en' && (
                    <div className="media-fact flex justify-between gap-2 text-sm">
                      <span className="text-slate-400">Original Title</span>
                      <span className="text-right font-semibold text-white">
                        {data.originalName}
                      </span>
                    </div>
                  )}

                <div className="media-fact flex justify-between gap-2 text-sm">
                  <span className="text-slate-400">Status</span>
                  <span className="text-right font-semibold text-white">
                    {data.status}
                  </span>
                </div>

                {data.firstAirDate && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">First Air Date</span>
                    <span className="text-right font-semibold text-white">
                      {new Date(data.firstAirDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </span>
                  </div>
                )}

                {data.nextEpisodeToAir?.airDate &&
                  data.nextEpisodeToAir.airDate !== data.firstAirDate && (
                    <div className="media-fact flex justify-between gap-2 text-sm">
                      <span className="text-slate-400">Next Air Date</span>
                      <span className="text-right font-semibold text-white">
                        {new Date(data.nextEpisodeToAir.airDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </span>
                    </div>
                  )}

                {data.episodeRunTime.length > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">Episode Runtime</span>
                    <span className="text-right font-semibold text-white">
                      {data.episodeRunTime[0]} minutes
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

                {data.networks.length > 0 && (
                  <div className="media-fact flex justify-between gap-2 text-sm">
                    <span className="text-slate-400">
                      {data.networks.length === 1 ? 'Network' : 'Networks'}
                    </span>
                    <span className="text-right font-semibold text-white">
                      {data.networks
                        .map((n) => n.name)
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
                        .map((s) => s.name)
                        .join(', ')}
                    </span>
                  </div>
                )}

                <div className="media-fact flex justify-between gap-2 text-sm">
                  <span className="text-slate-400">Links</span>
                  <span className="flex flex-wrap gap-2 text-right">
                    <a
                      href={`https://www.themoviedb.org/tv/${data.id}`}
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
          url={`/tv/${router.query.tvId}/recommendations`}
          linkUrl={`/tv/${data.id}/recommendations`}
        />

        <MediaSlider
          sliderKey="similar"
          title="Similar Series"
          url={`/tv/${router.query.tvId}/similar`}
          linkUrl={`/tv/${data.id}/similar`}
        />

        <div className="extra-bottom-space relative h-16" />
      </div>
    </div>
  )
}
