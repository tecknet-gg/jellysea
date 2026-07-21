import { Fragment, useState, useEffect, useRef, useMemo } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import CachedImage from '@app/components/Common/CachedImage'
import api from '@app/utils/api'
import { MediaStatus } from '@app/utils/types'
import type { PartyMedia } from '@app/utils/partyTypes'

interface LibraryBrowserModalProps {
  open: boolean
  onClose: () => void
  onSelect: (media: PartyMedia) => void
}

interface MediaItem {
  tmdbId: number
  mediaType: 'movie' | 'tv'
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
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [details, setDetails] = useState<Map<number, MediaDetails>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setMediaList([])
      setDetails(new Map())
      setSearch('')
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get<{ results: MediaItem[] }>('/media?filter=allavailable&take=200&sort=title')
      .then(({ data }) => {
        setMediaList(data.results ?? [])
        return data.results ?? []
      })
      .then(async (items) => {
        const map = new Map<number, MediaDetails>()
        const batchSize = 10
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize)
          await Promise.all(batch.map(async (item) => {
            if (map.has(item.tmdbId)) return
            try {
              const ep = item.mediaType === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`
              const { data } = await api.get<MediaDetails>(ep)
              map.set(item.tmdbId, data)
            } catch { /* skip items that fail to load */ }
          }))
          setDetails(new Map(map))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return mediaList
    const q = search.toLowerCase()
    return mediaList.filter((item) => {
      const d = details.get(item.tmdbId)
      const title = d?.title || d?.name || ''
      return title.toLowerCase().includes(q)
    })
  }, [mediaList, details, search])

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
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-16">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex w-full max-w-2xl flex-col rounded-2xl bg-dark-900 shadow-xl ring-1 ring-dark-600" style={{ maxHeight: '80vh' }}>
              <div className="flex items-center gap-3 border-b border-dark-600 px-4 py-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter your library..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loading && (
                  <div className="flex justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <p className="py-12 text-center text-sm text-slate-500">
                    {search ? 'No matching titles in your library' : 'Your library is empty'}
                  </p>
                )}

                {!loading && filtered.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                    {filtered.map((item) => {
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
                              title,
                              posterPath: d?.posterPath,
                              backdropPath: d?.backdropPath,
                              overview: d?.overview,
                            })
                            onClose()
                          }}
                          className="w-28 flex-shrink-0 overflow-hidden rounded-lg text-left transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-32"
                        >
                          {d?.posterPath ? (
                            <CachedImage
                              type="tmdb" src={d.posterPath} alt=""
                              className="w-full rounded-lg"
                              style={{ aspectRatio: '600/900' }}
                            />
                          ) : (
                            <div className="flex w-full items-center justify-center rounded-lg bg-dark-700 text-xs text-slate-500" style={{ aspectRatio: '600/900' }}>
                              Loading...
                            </div>
                          )}
                          <p className="mt-1 truncate text-xs font-medium text-slate-300">{title}</p>
                          {year && <p className="text-[10px] text-slate-500">{year}</p>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {!loading && (
                <div className="border-t border-dark-600 px-4 py-2 text-center text-xs text-slate-500">
                  {filtered.length} of {mediaList.length} title{mediaList.length !== 1 ? 's' : ''}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
