import { Fragment, useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import CachedImage from '@app/components/Common/CachedImage'
import { MediaStatus } from '@app/utils/types'
import api from '@app/utils/api'
import type { PartyMedia } from '@app/utils/partyTypes'

interface MediaSearchModalProps {
  open: boolean
  onClose: () => void
  onSelect: (media: PartyMedia) => void
}

interface SearchResult {
  id: number
  mediaType: 'movie' | 'tv'
  title?: string
  name?: string
  posterPath?: string
  backdropPath?: string
  releaseDate?: string
  firstAirDate?: string
  overview?: string
  mediaInfo?: {
    status: number
  }
}

export default function MediaSearchModal({ open, onClose, onSelect }: MediaSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get('/search', { params: { query: q } })
      const items: SearchResult[] = (data.results ?? data) || []
      const available = items.filter((r: SearchResult) => r.mediaInfo?.status === MediaStatus.AVAILABLE)
      setResults(available.slice(0, 10))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

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
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-dark-900 shadow-xl ring-1 ring-dark-600">
              <div className="flex items-center gap-3 border-b border-dark-600 px-4 py-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search available movies & TV shows..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
                  </div>
                )}
                {!loading && query && results.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">No results found</p>
                )}
                {results.map((item) => {
                  const title = item.title || item.name || 'Unknown'
                  const year = (item.releaseDate || item.firstAirDate || '').slice(0, 4)
                  return (
                    <button
                      key={`${item.mediaType}-${item.id}`}
                      onClick={() => {
                        onSelect({
                          tmdbId: item.id,
                          mediaType: item.mediaType,
                          title,
                          posterPath: item.posterPath,
                          backdropPath: item.backdropPath,
                          overview: item.overview,
                        })
                        onClose()
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-dark-800"
                    >
                      <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded">
                        {item.posterPath ? (
                          <CachedImage type="tmdb" src={item.posterPath} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-dark-700 text-xs text-slate-500">N/A</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{title}</p>
                        <p className="text-xs text-slate-400">
                          {item.mediaType === 'movie' ? 'Movie' : 'Series'}
                          {year && ` \u00b7 ${year}`}
                        </p>
                      </div>
                      <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-green-500" title="Available on Jellyfin" />
                    </button>
                  )
                })}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
