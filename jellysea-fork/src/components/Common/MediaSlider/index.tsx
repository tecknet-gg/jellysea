import useSWR from 'swr'
import api from '@app/utils/api'
import Slider from '../Slider'
import TitleCard from '../TitleCard'
import type { DiscoverResponse, MovieResult, TvResult } from '@app/utils/types'

interface MediaSliderProps {
  title: string
  url: string
  sliderKey: string
  linkUrl?: string
  extraParams?: string
  languageFilter?: string
}

export default function MediaSlider({ title, url, sliderKey, linkUrl, extraParams = '', languageFilter }: MediaSliderProps) {
  const { data, error } = useSWR<DiscoverResponse<MovieResult | TvResult>>(
    `${url}?page=1${extraParams ? `&${extraParams}` : ''}`,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const isLoading = !data && !error
  const isEmpty = data?.results.length === 0

  const items = data?.results
    .filter((item) => !languageFilter || item.originalLanguage === languageFilter)
    .slice(0, 20).map((item) => {
    const isMovie = item.mediaType === 'movie'
    const movieItem = item as MovieResult
    const tvItem = item as TvResult
    return (
      <TitleCard
        key={item.id}
        id={item.id}
        image={item.posterPath}
        title={isMovie ? movieItem.title : tvItem.name}
        year={isMovie ? movieItem.releaseDate?.split('-')[0] : tvItem.firstAirDate?.split('-')[0]}
        userScore={item.voteAverage}
        mediaType={isMovie ? 'movie' : 'tv'}
        status={item.mediaInfo?.status}
      />
    )
  })

  return (
    <div className="mb-6">
      <div className="slider-header flex relative mb-4 mt-6">
        <div className="slider-title inline-flex items-center text-xl font-bold leading-7 text-slate-300 sm:text-2xl">
          {title}
        </div>
      </div>
      <Slider
        sliderKey={sliderKey}
        items={items}
        isLoading={isLoading}
        isEmpty={isEmpty}
      />
    </div>
  )
}