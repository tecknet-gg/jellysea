import { useState, useEffect } from 'react'
import useSWR from 'swr'
import api from '@app/utils/api'
import type { TvSeason } from '@app/utils/types'

interface SeasonEpisodeSelectorProps {
  tmdbId: number
  initialSeason?: number
  initialEpisode?: number
  onSeasonChange: (season: number) => void
  onEpisodeChange: (episode: number) => void
}

interface SeasonDetails {
  seasonNumber: number
  name: string
  airDate: string | null
  episodeCount: number
  episodes?: { episodeNumber: number; name: string }[]
  overview: string
  id: number
  posterPath?: string
}

export default function SeasonEpisodeSelector({
  tmdbId,
  initialSeason,
  initialEpisode,
  onSeasonChange,
  onEpisodeChange,
}: SeasonEpisodeSelectorProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | ''>(initialSeason ?? '')
  const [selectedEpisode, setSelectedEpisode] = useState<number | ''>(initialEpisode ?? '')

  const { data: tvData } = useSWR<{ seasons: TvSeason[] }>(
    `/tv/${tmdbId}`,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const seasons = (tvData?.seasons ?? []).filter((s) => s.seasonNumber > 0 && s.episodeCount > 0)

  const { data: seasonData } = useSWR<SeasonDetails>(
    selectedSeason !== '' ? `/tv/${tmdbId}/season/${selectedSeason}` : null,
    (url: string) => api.get(url).then((r) => r.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  const episodes = seasonData?.episodes ?? []

  useEffect(() => {
    if (selectedSeason !== '' && episodes.length === 1) {
      setSelectedEpisode(episodes[0].episodeNumber)
      onEpisodeChange(episodes[0].episodeNumber)
    }
  }, [episodes, selectedSeason, onEpisodeChange])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs text-slate-500">Season</label>
        <select
          value={selectedSeason}
          onChange={(e) => {
            const v = e.target.value === '' ? '' : Number(e.target.value)
            setSelectedSeason(v)
            setSelectedEpisode('')
            if (v !== '') onSeasonChange(v)
          }}
          className="rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-sm text-white focus:border-accent-500 focus:outline-none"
        >
          <option value="">Select season</option>
          {seasons.map((s) => (
            <option key={s.seasonNumber} value={s.seasonNumber}>
              {s.seasonNumber} — {s.name || `Season ${s.seasonNumber}`} ({s.episodeCount} ep.)
            </option>
          ))}
        </select>
      </div>
      {selectedSeason !== '' && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">Episode</label>
          <select
            value={selectedEpisode}
            onChange={(e) => {
              const v = e.target.value === '' ? '' : Number(e.target.value)
              setSelectedEpisode(v)
              if (v !== '') onEpisodeChange(v)
            }}
            className="rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-sm text-white focus:border-accent-500 focus:outline-none"
          >
            <option value="">Select episode</option>
            {episodes.map((ep) => (
              <option key={ep.episodeNumber} value={ep.episodeNumber}>
                {ep.episodeNumber}. {ep.name || `Episode ${ep.episodeNumber}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
