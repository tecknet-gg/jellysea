import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function SearchInput() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSearchPage = router.pathname === '/search'
  const urlQuery = isSearchPage && typeof router.query.query === 'string' ? router.query.query : ''

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (isSearchPage) {
      setQuery(urlQuery)
      setDebounced(urlQuery)
    } else {
      setQuery('')
      setDebounced('')
    }
  }, [isSearchPage, urlQuery])

  useEffect(() => {
    if (debounced.length < 2) return
    if (!focused) return
    if (isSearchPage && debounced === urlQuery) return
    const target = `/search?query=${encodeURIComponent(debounced)}`
    if (isSearchPage) {
      router.replace(target)
    } else {
      router.push(target)
    }
  }, [debounced, focused, isSearchPage, urlQuery, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('')
      setDebounced('')
      inputRef.current?.blur()
      return
    }
    if (e.key === 'Enter' && query.length >= 2) {
      e.preventDefault()
      const target = `/search?query=${encodeURIComponent(query)}`
      router.push(target)
    }
  }

  return (
    <div className="relative mx-auto hidden w-full max-w-3xl md:block">
      <div className="relative flex items-center">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search movies and series..."
          className="w-full rounded-full border border-dark-600 bg-dark-800 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  )
}
