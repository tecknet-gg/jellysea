import useSWR from 'swr'
import api from '@app/utils/api'
import TitleCard from '@app/components/Common/TitleCard'
import type { MediaStatus } from '@app/utils/types'

interface TmdbTitleCardProps {
  tmdbId: number
  tvdbId?: number
  type: 'movie' | 'tv'
  status?: MediaStatus
}

interface MovieDetails {
  id: number
  title: string
  posterPath?: string
  voteAverage?: number
  releaseDate?: string
}

interface TvDetails {
  id: number
  name: string
  posterPath?: string
  voteAverage?: number
  firstAirDate?: string
}

const isMovie = (data: MovieDetails | TvDetails): data is MovieDetails =>
  'title' in data

export default function TmdbTitleCard({ tmdbId, type, status }: TmdbTitleCardProps) {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const { data, error } = useSWR<MovieDetails | TvDetails>(
    endpoint,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (!data && !error) {
    return (
      <div className="w-36 sm:w-36 md:w-44">
        <div className="relative rounded-xl bg-dark-900" style={{ paddingBottom: '150%' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) return null

  return (
    <TitleCard
      id={data.id}
      image={data.posterPath}
      title={isMovie(data) ? data.title : data.name}
      year={
        isMovie(data)
          ? data.releaseDate?.split('-')[0]
          : data.firstAirDate?.split('-')[0]
      }
      userScore={data.voteAverage}
      mediaType={type}
      status={status}
    />
  )
}
