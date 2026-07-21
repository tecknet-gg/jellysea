import { Fragment, useState, useEffect } from 'react'
import { Transition, Dialog } from '@headlessui/react'
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import FilterSelect, {
  LANGUAGE_OPTIONS,
  MOVIE_CERTIFICATION_OPTIONS,
  TV_CERTIFICATION_OPTIONS,
  TV_STATUS_OPTIONS,
  REGION_OPTIONS,
} from './FilterSelect'
import FilterRange from './FilterRange'
import FilterCheckboxGroup from './FilterCheckboxGroup'
import FilterCertification from './FilterCertification'
import type { DiscoverFiltersState, Genre } from '@/utils/types'

const sortOptions = [
  { value: 'popularity.desc', label: 'Popularity Descending' },
  { value: 'popularity.asc', label: 'Popularity Ascending' },
  { value: 'vote_average.desc', label: 'TMDB Rating Descending' },
  { value: 'vote_average.asc', label: 'TMDB Rating Ascending' },
  { value: 'vote_count.desc', label: 'Vote Count Descending' },
  { value: 'vote_count.asc', label: 'Vote Count Ascending' },
]

const movieSortOptions = [
  ...sortOptions,
  { value: 'release_date.desc', label: 'Release Date Descending' },
  { value: 'release_date.asc', label: 'Release Date Ascending' },
  { value: 'original_title.asc', label: 'Title (A-Z)' },
  { value: 'original_title.desc', label: 'Title (Z-A)' },
]

const tvSortOptions = [
  ...sortOptions,
  { value: 'first_air_date.desc', label: 'First Air Date Descending' },
  { value: 'first_air_date.asc', label: 'First Air Date Ascending' },
  { value: 'name.asc', label: 'Title (A-Z)' },
  { value: 'name.desc', label: 'Title (Z-A)' },
]

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'partial', label: 'Partially Available' },
  { value: 'processing', label: 'Processing' },
  { value: 'pending', label: 'Pending' },
]

interface FilterSlideoverProps {
  open: boolean
  onClose: () => void
  onApply: (filters: Partial<DiscoverFiltersState>) => void
  initialFilters: DiscoverFiltersState
  mediaType: 'movie' | 'tv'
  genres: Genre[]
}

export default function FilterSlideover({ open, onClose, onApply, initialFilters, mediaType, genres }: FilterSlideoverProps) {
  const [filters, setFilters] = useState<DiscoverFiltersState>(initialFilters)

  useEffect(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const sortOptionsList = mediaType === 'movie' ? movieSortOptions : tvSortOptions

  const genreOptions = genres.map((g) => ({ value: String(g.id), label: g.name }))

  const updateFilter = (key: keyof DiscoverFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply(filters)
    onClose()
  }

  const handleReset = () => {
    const reset: DiscoverFiltersState = {
      sortBy: 'popularity.desc',
      genre: '',
      studio: '',
      network: '',
      yearGte: '',
      yearLte: '',
      status: '',
      voteAverageGte: '',
      voteAverageLte: '',
      voteCountGte: '',
      voteCountLte: '',
      keywords: '',
      excludeKeywords: '',
      language: '',
      runtimeGte: '',
      runtimeLte: '',
      certification: '',
      certificationCountry: '',
      watchProviders: '',
      watchRegion: '',
      tvStatus: '',
    }
    setFilters(reset)
    onApply(reset)
    onClose()
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-dark/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-dark-900 py-6 shadow-xl">
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="flex items-center gap-2 text-lg font-medium text-white">
                          <FunnelIcon className="h-5 w-5" />
                          Filters
                        </Dialog.Title>
                        <button
                          onClick={onClose}
                          className="rounded-md text-slate-400 hover:text-white focus:outline-none"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-1 flex-col gap-6 px-4 sm:px-6">
                      <FilterSelect
                        label="Sort By"
                        options={sortOptionsList}
                        value={filters.sortBy}
                        onChange={(v) => updateFilter('sortBy', v)}
                      />

                      <FilterCheckboxGroup
                        label="Genres"
                        options={genreOptions}
                        value={filters.genre}
                        onChange={(v) => updateFilter('genre', v)}
                      />

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Keywords (IDs)</label>
                        <input
                          type="text"
                          value={filters.keywords}
                          onChange={(e) => updateFilter('keywords', e.target.value)}
                          placeholder="Include (comma-separated IDs)"
                          className="mb-2 w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={filters.excludeKeywords}
                          onChange={(e) => updateFilter('excludeKeywords', e.target.value)}
                          placeholder="Exclude (comma-separated IDs)"
                          className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <FilterSelect
                        label="Original Language"
                        options={LANGUAGE_OPTIONS}
                        value={filters.language}
                        onChange={(v) => updateFilter('language', v)}
                      />

                      {mediaType === 'movie' ? (
                        <>
                          <FilterRange
                            label="Release Year"
                            fromValue={filters.yearGte}
                            toValue={filters.yearLte}
                            onFromChange={(v) => updateFilter('yearGte', v)}
                            onToChange={(v) => updateFilter('yearLte', v)}
                            placeholder="YYYY"
                          />

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Studio ID</label>
                            <input
                              type="text"
                              value={filters.studio || ''}
                              onChange={(e) => updateFilter('studio', e.target.value)}
                              placeholder="e.g. 9993 (DC Comics)"
                              className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <FilterCertification
                            label="Content Rating"
                            options={MOVIE_CERTIFICATION_OPTIONS}
                            value={filters.certification}
                            onChange={(v) => updateFilter('certification', v)}
                          />
                        </>
                      ) : (
                        <>
                          <FilterRange
                            label="First Air Date Year"
                            fromValue={filters.yearGte}
                            toValue={filters.yearLte}
                            onFromChange={(v) => updateFilter('yearGte', v)}
                            onToChange={(v) => updateFilter('yearLte', v)}
                            placeholder="YYYY"
                          />

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">Network ID</label>
                            <input
                              type="text"
                              value={filters.network || ''}
                              onChange={(e) => updateFilter('network', e.target.value)}
                              placeholder="e.g. 213 (Netflix)"
                              className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <FilterCheckboxGroup
                            label="TV Status"
                            options={TV_STATUS_OPTIONS}
                            value={filters.tvStatus}
                            onChange={(v) => updateFilter('tvStatus', v)}
                          />

                          <FilterCertification
                            label="Content Rating"
                            options={TV_CERTIFICATION_OPTIONS}
                            value={filters.certification}
                            onChange={(v) => updateFilter('certification', v)}
                          />
                        </>
                      )}

                      <FilterRange
                        label="Runtime (minutes)"
                        fromValue={filters.runtimeGte}
                        toValue={filters.runtimeLte}
                        onFromChange={(v) => updateFilter('runtimeGte', v)}
                        onToChange={(v) => updateFilter('runtimeLte', v)}
                        placeholder="Minutes"
                      />

                      <FilterSelect
                        label="Media Status"
                        options={statusOptions}
                        value={filters.status}
                        onChange={(v) => updateFilter('status', v)}
                      />

                      <FilterRange
                        label="TMDB Rating"
                        fromValue={filters.voteAverageGte}
                        toValue={filters.voteAverageLte}
                        onFromChange={(v) => updateFilter('voteAverageGte', v)}
                        onToChange={(v) => updateFilter('voteAverageLte', v)}
                        placeholder="0-10"
                      />

                      <FilterRange
                        label="Vote Count"
                        fromValue={filters.voteCountGte}
                        toValue={filters.voteCountLte}
                        onFromChange={(v) => updateFilter('voteCountGte', v)}
                        onToChange={(v) => updateFilter('voteCountLte', v)}
                        placeholder="e.g. 100"
                      />

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">Watch Providers</label>
                        <input
                          type="text"
                          value={filters.watchProviders}
                          onChange={(e) => updateFilter('watchProviders', e.target.value)}
                          placeholder="Provider IDs (comma-separated)"
                          className="w-full rounded-lg border border-dark-500 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <FilterSelect
                        label="Watch Region"
                        options={REGION_OPTIONS}
                        value={filters.watchRegion}
                        onChange={(v) => updateFilter('watchRegion', v)}
                      />
                    </div>

                    <div className="mt-6 flex flex-shrink-0 gap-3 border-t border-dark-600 px-4 pt-4 sm:px-6">
                      <button
                        onClick={handleReset}
                        className="flex-1 rounded-lg border border-dark-500 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-dark-800"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleApply}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export function countActiveFilters(filters: DiscoverFiltersState): number {
  let count = 0
  if (filters.genre) count++
  if (filters.studio) count++
  if (filters.network) count++
  if (filters.yearGte || filters.yearLte) count++
  if (filters.status) count++
  if (filters.voteAverageGte || filters.voteAverageLte) count++
  if (filters.voteCountGte || filters.voteCountLte) count++
  if (filters.keywords) count++
  if (filters.excludeKeywords) count++
  if (filters.language) count++
  if (filters.runtimeGte || filters.runtimeLte) count++
  if (filters.certification) count++
  if (filters.watchProviders) count++
  if (filters.watchRegion) count++
  if (filters.tvStatus) count++
  return count
}