import useSWR from 'swr'
import api from '@/utils/api'
import Slider from '@/components/Common/Slider'
import TmdbTitleCard from '@/components/Common/TmdbTitleCard'
import type { MediaStatus } from '@/utils/types'

interface MediaResult {
  id: number
  tmdbId: number
  tvdbId?: number
  mediaType: 'movie' | 'tv'
  status: MediaStatus
}

interface MediaResultsResponse {
  pageInfo: {
    pages: number
    pageSize: number
    results: number
    page: number
  }
  results: MediaResult[]
}

export default function RecentlyAddedSlider() {
  const { data, error } = useSWR<MediaResultsResponse>(
    '/media?filter=allavailable&take=20&sort=mediaAdded',
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const isLoading = !data && !error
  const results = data?.results ?? []
  const isEmpty = results.length === 0

  const items = results.map((item) => (
    <TmdbTitleCard
      key={`media-slider-item-${item.id}`}
      tmdbId={item.tmdbId}
      tvdbId={item.tvdbId}
      type={item.mediaType}
      status={item.status}
    />
  ))

  return (
    <div className="mb-6">
      <div className="slider-header flex relative mb-4 mt-6">
        <div className="slider-title inline-flex items-center text-xl font-bold leading-7 text-slate-300 sm:text-2xl">
          Recently Added
        </div>
      </div>
      <Slider
        sliderKey="recently-added"
        items={items}
        isLoading={isLoading}
        isEmpty={isEmpty}
      />
    </div>
  )
}
