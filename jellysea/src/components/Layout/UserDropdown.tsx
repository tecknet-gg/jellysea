import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/hooks/useUser'
import CachedImage from '@/components/Common/CachedImage'
import api from '@/utils/api'

export default function UserDropdown() {
  const { user, revalidate } = useUser()

  const handleLogout = async () => {
    await api.post('/auth/logout')
    revalidate()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <Menu as="div" className="relative ml-3">
      <Menu.Button className="flex rounded-full bg-dark-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-dark-900">
        <CachedImage
          type="avatar"
          src={user.avatar}
          alt={user.displayName}
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
        <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-dark-900/80 shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur focus:outline-none">
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
                    active ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' : 'text-slate-300'
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
  )
}