import useSWR from 'swr'
import Link from 'next/link'
import api from '@app/utils/api'
import Slider from '@app/components/Common/Slider'
import GenreCard, { GenreCardPlaceholder } from '@app/components/JellyseaGenreCard'
import { genreColorMap } from '@app/utils/genreColors'
import type { GenreSliderItem } from '@app/utils/types'
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline'

interface GenreSliderProps {
  title: string
  endpoint: string
  mediaType: 'movie' | 'tv'
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w1280_filter(duotone'

export default function GenreSlider({ title, endpoint, mediaType }: GenreSliderProps) {
  const { data, error } = useSWR<GenreSliderItem[]>(
    endpoint,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const isLoading = !data && !error
  const isEmpty = data?.length === 0

  const baseUrl = mediaType === 'movie' ? '/discover/movies' : '/discover/tv'

  const items = data?.map((genre) => {
    const colors = genreColorMap[genre.id] ?? genreColorMap[0]
    const backdrop = genre.backdrops?.[4]
    const image = backdrop
      ? `${TMDB_IMG},${colors[0]},${colors[1]})${backdrop}`
      : ''

    return (
      <GenreCard
        key={`genre-${genre.id}`}
        name={genre.name}
        image={image}
        url={`${baseUrl}?genre=${genre.id}`}
      />
    )
  })

  return (
    <div className="mb-6">
      <div className="slider-header flex relative mb-4 mt-6">
        <Link href={`${baseUrl}/genres`}>
          <div className="slider-title inline-flex cursor-pointer items-center gap-2 text-xl font-bold leading-7 text-slate-300 hover:text-white sm:text-2xl">
            <span>{title}</span>
            <ArrowRightCircleIcon className="h-5 w-5" />
          </div>
        </Link>
      </div>
      <Slider
        sliderKey={endpoint}
        items={items}
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage="No genres available."
        placeholder={<GenreCardPlaceholder />}
      />
    </div>
  )
}
