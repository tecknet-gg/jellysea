import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, FilmIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import useSWR from 'swr'
import CachedImage from '@app/components/Common/CachedImage'
import api from '@app/utils/api'
import { MediaStatus } from '@app/utils/types'
import type { PartyMedia } from '@app/utils/partyTypes'

interface LibraryBrowserModalProps {
  open: boolean
  onClose: () => void
  onSelect: (media: PartyMedia) => void
}

interface MediaResult {
  id: number
  tmdbId: number
  tvdbId?: number
  mediaType: 'movie' | 'tv'
  status: MediaStatus
}

interface MediaResultsResponse {
  pageInfo: { pages: number; pageSize: number; results: number; page: number }
  results: MediaResult[]
}

interface MediaDetails {
  id: number
  title?: string
  name?: string
  posterPath?: string
  backdropPath?: string
  overview?: string
  releaseDate?: string
  firstAirDate?: string
}

export default function LibraryBrowserModal({ open, onClose, onSelect }: LibraryBrowserModalProps) {
  const { data, error } = useSWR<MediaResultsResponse>(
    open ? '/media?filter=allavailable&take=200&sort=mediaAdded' : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  const [details, setDetails] = useState<Map<number, MediaDetails>>(new Map())

  const results = data?.results ?? []

  useEffect(() => {
    if (!open) { setDetails(new Map()); return }
  }, [open])

  useEffect(() => {
    if (results.length === 0) return
    ;(async () => {
      const map = new Map<number, MediaDetails>()
      for (let i = 0; i < results.length; i += 10) {
        const batch = results.slice(i, i + 10)
        await Promise.all(batch.map(async (item) => {
          if (map.has(item.tmdbId)) return
          try {
            const ep = item.mediaType === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`
            const { data: d } = await api.get<MediaDetails>(ep)
            map.set(item.tmdbId, d)
          } catch { /* skip */ }
        }))
        setDetails(new Map(map))
      }
    })()
  }, [results])

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-12">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex w-full max-w-4xl flex-col rounded-2xl bg-dark-900 shadow-xl ring-1 ring-dark-600" style={{ maxHeight: '85vh' }}>
              <div className="flex items-center justify-between border-b border-dark-600 px-5 py-3">
                <Dialog.Title className="text-base font-bold text-white">Select Media</Dialog.Title>
                <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-dark-800 hover:text-white">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {!data && !error && (
                  <div className="flex justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-accent-500 border-t-transparent" />
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                    <p className="text-sm text-red-400">Failed to load library</p>
                    <p className="text-xs text-slate-500">Make sure you are logged in and have media available</p>
                  </div>
                )}

                {data && results.length === 0 && (
                  <p className="py-16 text-center text-sm text-slate-500">No available media found in your library</p>
                )}

                {results.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
                    {results.map((item) => {
                      const d = details.get(item.tmdbId)
                      const title = d?.title || d?.name || ''
                      const year = (d?.releaseDate || d?.firstAirDate || '').slice(0, 4)
                      return (
                        <button
                          key={item.tmdbId}
                          onClick={() => {
                            onSelect({
                              tmdbId: item.tmdbId,
                              mediaType: item.mediaType,
                              title: title || `TMDB ${item.tmdbId}`,
                              posterPath: d?.posterPath,
                              backdropPath: d?.backdropPath,
                              overview: d?.overview,
                            })
                            onClose()
                          }}
                          className="w-28 flex-shrink-0 overflow-hidden rounded-lg text-left transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-500 sm:w-32"
                        >
                          {d?.posterPath ? (
                            <CachedImage type="tmdb" src={d.posterPath} alt="" className="w-full rounded-lg" style={{ aspectRatio: '600/900' }} />
                          ) : (
                            <div className="flex w-full items-center justify-center rounded-lg bg-dark-700" style={{ aspectRatio: '600/900' }}>
                              <FilmIcon className="h-8 w-8 text-slate-600" />
                            </div>
                          )}
                          <p className="mt-1.5 truncate text-xs font-medium text-slate-300">{title || (d ? '' : 'Loading...')}</p>
                          {year && <p className="text-[10px] text-slate-500">{year}</p>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <div className="border-t border-dark-600 px-5 py-2 text-center text-xs text-slate-500">
                  {results.length} title{results.length !== 1 ? 's' : ''}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
