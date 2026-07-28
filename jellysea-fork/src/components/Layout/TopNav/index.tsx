import Badge from '@app/components/Common/Badge'
import CachedImage from '@app/components/Common/CachedImage'
import SearchInput from '@app/components/Layout/SearchInput'
import { usePlayer } from '@app/context/PlayerContext'
import { useUser, Permission } from '@app/hooks/useUser'
import { Menu, Transition } from '@headlessui/react'
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ClockIcon,
  Cog6ToothIcon,
  FilmIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  TvIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { version } from '../../../../package.json'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Fragment, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'

const navLinks = [
  { href: '/', label: 'Home', icon: HomeIcon, regex: /^\/$/ },
  { href: '/discover/movies', label: 'Movies', icon: FilmIcon, regex: /^\/discover\/movies/ },
  { href: '/discover/tv', label: 'Series', icon: TvIcon, regex: /^\/discover\/tv/ },
  { href: '/requests', label: 'Requests', icon: ClockIcon, regex: /^\/requests/ },
  { href: '/parties', label: 'Parties', icon: UserGroupIcon, regex: /^\/parties/ },
]

const mobileNavLinks = [
  { href: '/', label: 'Home', icon: HomeIcon, regex: /^\/$/ },
  { href: '/discover/movies', label: 'Movies', icon: FilmIcon, regex: /^\/discover\/movies/ },
  { href: '/discover/tv', label: 'Series', icon: TvIcon, regex: /^\/discover\/tv/ },
  { href: '/requests', label: 'Requests', icon: ClockIcon, regex: /^\/requests/ },
  { href: '/parties', label: 'Parties', icon: UserGroupIcon, regex: /^\/parties/ },
]

function NavLink({
  href,
  label,
  icon: Icon,
  regex,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  regex: RegExp
  onClick?: () => void
}) {
  const router = useRouter()
  const isActive = regex.test(router.pathname)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`topnav-link ${isActive ? 'active' : ''}`}
    >
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{label}</span>
    </Link>
  )
}

export default function TopNav() {
  const router = useRouter()
  const { user, hasPermission, revalidate } = useUser()
  const { playerActive } = usePlayer()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (searchOpen) setSearchOpen(false)
  }, [router.pathname])

  const isAuthPage = router.pathname.match(/(login|setup|resetpassword)/)
  const isWatchPage = router.pathname.startsWith('/watch')

  if (isAuthPage || isWatchPage || playerActive) return null

  const handleLogout = async () => {
    const response = await axios.post('/api/v1/auth/logout')
    if (response.data?.status === 'ok') {
      revalidate()
    }
  }

  const showSearchButton = router.pathname === '/' || router.pathname === '/search' || router.pathname.startsWith('/discover')

  return (
    <>
      <div className="topnav">
        <Link href="/" className="topnav-logo flex-shrink-0">
          <div className="topnav-logo-icon">
            <PlayIcon className="h-4 w-4" />
          </div>
          <span className="hidden text-lg font-bold text-white sm:block">
            Jellysea
          </span>
        </Link>

        <div className="mx-6 hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
          {hasPermission([Permission.ADMIN, Permission.MANAGE_ISSUES], { type: 'or' }) && (
            <NavLink
              href="/settings"
              label="Admin"
              icon={AdjustmentsHorizontalIcon}
              regex={/^\/settings/}
            />
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {showSearchButton && (
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-ghost p-2"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          )}

          <span className="hidden text-xs text-slate-500 sm:inline">
            v{version}
          </span>

          {hasPermission(Permission.ADMIN) && (
            <Link href="/settings" className="btn-ghost p-2">
              <Cog6ToothIcon className="h-5 w-5" />
            </Link>
          )}

          <Menu as="div" className="relative">
            <Menu.Button className="flex rounded-full focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-midnight-900">
              <CachedImage
                type="avatar"
                src={user?.avatar ?? ''}
                alt={user?.displayName || 'Avatar'}
                className="h-8 w-8 rounded-full"
              />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-midnight-700 bg-midnight-900 shadow-xl backdrop-blur-xl focus:outline-none">
                <div className="border-b border-midnight-700 px-4 py-3">
                  <p className="text-sm font-medium text-white">{user?.displayName}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/profile"
                        className={`${
                          active ? 'bg-midnight-700 text-white' : 'text-slate-300'
                        } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition`}
                      >
                        <Cog6ToothIcon className="mr-3 h-4 w-4" />
                        Profile Settings
                      </Link>
                    )}
                  </Menu.Item>
                  {hasPermission(Permission.ADMIN) && (
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/settings"
                          className={`${
                            active ? 'bg-midnight-700 text-white' : 'text-slate-300'
                          } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition`}
                        >
                          <AdjustmentsHorizontalIcon className="mr-3 h-4 w-4" />
                          Admin Settings
                        </Link>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-midnight-700 text-white' : 'text-slate-300'
                        } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition`}
                      >
                        <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                        Sign Out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      {searchOpen && (
        <div className="searchbar-overlay animate-fade-in">
          <div className="flex items-center border-b border-midnight-700 px-4 py-3">
            <div className="flex flex-1">
              <SearchInput />
            </div>
            <button
              onClick={() => setSearchOpen(false)}
              className="btn-ghost ml-3 p-2"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-slate-500">Type to search movies and series...</p>
          </div>
        </div>
      )}

      <div className="navbar">
        {mobileNavLinks.map((link) => {
          const isActive = link.regex.test(router.pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${isActive ? 'active' : ''}`}
            >
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
