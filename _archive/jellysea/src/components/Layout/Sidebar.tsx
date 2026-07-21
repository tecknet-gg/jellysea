import { useRouter } from 'next/router'
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  HomeIcon,
  FilmIcon,
  TvIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useUser } from '@/hooks/useUser'
import CachedImage from '@/components/Common/CachedImage'
import api from '@/utils/api'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navLinks = [
  { href: '/', label: 'Home', icon: HomeIcon, regex: /^\/$/ },
  { href: '/discover/movies', label: 'Movies', icon: FilmIcon, regex: /^\/discover\/movies/ },
  { href: '/discover/tv', label: 'Series', icon: TvIcon, regex: /^\/discover\/tv/ },
]

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const router = useRouter()
  const { user, revalidate } = useUser()

  const handleLogout = async () => {
    await api.post('/auth/logout')
    revalidate()
    window.location.href = '/login'
  }

  return (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-center pt-4 pb-2">
        <div className="text-xl font-bold text-white">J</div>
      </div>
      <div className="mt-4 flex flex-1 flex-col items-center gap-1 px-2">
        {navLinks.map((link) => {
          const isActive = link.regex
            ? link.regex.test(router.pathname)
            : router.pathname === link.href
          return (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault()
                onLinkClick?.()
                router.push(link.href)
              }}
              className={`flex items-center justify-center rounded-lg p-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  : 'text-slate-300 hover:bg-dark-800 hover:text-white'
              }`}
            >
              <link.icon className="h-6 w-6 flex-shrink-0" />
            </a>
          )
        })}
      </div>
      <div className="border-t border-dark-600 px-2 py-3">
        <Menu as="div" className="relative flex justify-center">
          <Menu.Button className="flex rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-dark-900">
            <CachedImage
              type="avatar"
              src={user?.avatar}
              alt={user?.displayName || 'Avatar'}
              className="h-9 w-9 rounded-full"
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
            <Menu.Items className="absolute bottom-full left-full z-50 mb-2 ml-2 w-48 origin-bottom-left rounded-md bg-dark-900/80 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur focus:outline-none">
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-white">{user?.displayName}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <div className="border-t border-dark-600">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                          : 'text-slate-300'
                      } group flex w-full items-center px-4 py-2 text-sm`}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Sign Out
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </nav>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-20 lg:flex-col lg:z-40">
        <div className="flex min-h-0 flex-1 flex-col border-r border-dark-600 bg-gradient-to-b from-dark-900 to-dark">
          <SidebarContent />
        </div>
      </div>

      <Transition show={open} as={Fragment}>
        <div className="fixed inset-0 z-30 flex lg:hidden">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-dark opacity-90" onClick={onClose} />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex w-48 max-w-xs flex-1 flex-col bg-gradient-to-b from-dark-900 to-dark">
              <div className="absolute right-0 top-0 -mr-12 pt-2">
                <button
                  onClick={onClose}
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
              <SidebarContent onLinkClick={onClose} />
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  )
}
