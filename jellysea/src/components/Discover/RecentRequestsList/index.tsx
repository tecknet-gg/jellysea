import useSWR from 'swr'
import api from '@/utils/api'
import Slider from '@/components/Common/Slider'
import RequestCard from './RequestCard'
import type { MediaRequest } from '@/utils/types'

interface RequestResultsResponse {
  pageInfo: {
    pages: number
    pageSize: number
    results: number
    page: number
  }
  results: (MediaRequest & {
    profileName?: string
    canRemove?: boolean
  })[]
}

export default function RecentRequestsSlider() {
  const { data, error } = useSWR<RequestResultsResponse>(
    '/request?filter=all&take=10&sort=modified&skip=0',
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const isLoading = !data && !error
  const results = data?.results ?? []
  const isEmpty = results.length === 0

  const items = results.map((req) => (
    <RequestCard key={`request-slider-item-${req.id}`} request={req} />
  ))

  return (
    <div className="mb-6">
      <div className="slider-header flex relative mb-4 mt-6">
        <div className="slider-title inline-flex items-center text-xl font-bold leading-7 text-slate-300 sm:text-2xl">
          Recent Requests
        </div>
      </div>
      <Slider
        sliderKey="requests"
        items={items}
        isLoading={isLoading}
        isEmpty={isEmpty}
      />
    </div>
  )
}
