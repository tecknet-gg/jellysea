import useSWRInfinite from 'swr/infinite'
import api from '@/utils/api'
import type { DiscoverResponse, MovieResult, TvResult } from '@/utils/types'

const PAGE_SIZE = 20

export function useDiscover<T extends { id: number } = MovieResult | TvResult>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
) {
  const getKey = (pageIndex: number, previousPageData: DiscoverResponse<T> | null) => {
    if (previousPageData && previousPageData.results.length < PAGE_SIZE) return null
    const searchParams = new URLSearchParams()
    searchParams.set('page', String(pageIndex + 1))
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value))
      }
    })
    return `${endpoint}?${searchParams.toString()}`
  }

  const { data, error, size, setSize, isValidating } = useSWRInfinite<DiscoverResponse<T>>(
    getKey,
    (url: string) => api.get(url).then((res) => res.data),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const rawTitles = data ? data.flatMap((page) => page.results) : []
  const titles = rawTitles.filter(
    (value, index, self) => index === self.findIndex((t) => t.id === value.id)
  )
  const isReachingEnd = data ? data[data.length - 1]?.results.length < PAGE_SIZE : false
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined'
  const isEmpty = data?.[0]?.results.length === 0
  const isRefreshing = isValidating && data && data.length === size

  return {
    titles,
    isLoading: !data && !error,
    isLoadingMore: !!isLoadingMore,
    isReachingEnd: !!isReachingEnd,
    isEmpty: !!isEmpty,
    isRefreshing: !!isRefreshing,
    fetchMore: () => setSize(size + 1),
    error,
  }
}