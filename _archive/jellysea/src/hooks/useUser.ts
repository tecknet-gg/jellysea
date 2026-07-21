import useSWR from 'swr'
import api from '@/utils/api'
import type { User } from '@/utils/types'

export function useUser() {
  const { data, error, isValidating, mutate } = useSWR<User>('/auth/me', {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    errorRetryInterval: 30000,
    shouldRetryOnError: false,
  })

  return {
    user: data,
    loading: (!data && !error) || isValidating,
    error,
    revalidate: mutate,
  }
}