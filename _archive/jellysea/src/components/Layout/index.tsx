import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline'
import Sidebar from './Sidebar'
import SearchInput from './SearchInput'
import { useUser } from '@/hooks/useUser'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.pageYOffset > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-full min-h-full min-w-0 bg-dark">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative mb-16 flex w-0 min-w-0 flex-1 flex-col lg:ml-20">
        <div
          className={`searchbar fixed left-0 right-0 top-0 z-10 flex flex-shrink-0 items-center px-4 transition ${
            isScrolled ? 'bg-dark-800/80' : 'bg-transparent'
          } lg:left-20`}
          style={{ height: 'calc(4rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)', backdropFilter: isScrolled ? 'blur(5px)' : undefined }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-3 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-white focus:outline-none lg:hidden"
          >
            <Bars3BottomLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-center">
            <SearchInput />
          </div>
        </div>

        <main className="relative top-16 z-0 focus:outline-none">
          <div className="mb-6">
            <div className="mx-auto max-w-8xl px-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}