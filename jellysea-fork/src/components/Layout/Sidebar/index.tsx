import Badge from '@app/components/Common/Badge';
import CachedImage from '@app/components/Common/CachedImage';
import { version } from '../../../../package.json';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { Menu, Transition } from '@headlessui/react';
import {
  ClockIcon,
  CogIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  FilmIcon,
  HomeIcon,
  ShieldCheckIcon,
  TvIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  WrenchIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Fragment, useState } from 'react';
import { useIntl } from 'react-intl';

export const menuMessages = defineMessages('components.Layout.Sidebar', {
  dashboard: 'Discover',
  browsemovies: 'Movies',
  browsetv: 'Series',
  requests: 'Requests',
  blocklist: 'Blocklist',
  issues: 'Issues',
  users: 'Users',
  settings: 'Settings',
});

interface SidebarProps {
  open?: boolean;
  setClosed: () => void;
  pendingRequestsCount: number;
  openIssuesCount: number;
  revalidateIssueCount: () => void;
  revalidateRequestsCount: () => void;
  hidden?: boolean;
}

interface SidebarLinkProps {
  href: string;
  svgIcon: React.ReactNode;
  label: string;
  activeRegExp: RegExp;
  as?: string;
  requiredPermission?: Permission | Permission[];
  permissionType?: 'and' | 'or';
}

const navLinks: SidebarLinkProps[] = [
  {
    href: '/',
    label: 'Home',
    svgIcon: <HomeIcon className="h-6 w-6" />,
    activeRegExp: /^\/$/,
  },
  {
    href: '/discover/movies',
    label: 'Movies',
    svgIcon: <FilmIcon className="h-6 w-6" />,
    activeRegExp: /^\/discover\/movies/,
  },
  {
    href: '/discover/tv',
    label: 'Series',
    svgIcon: <TvIcon className="h-6 w-6" />,
    activeRegExp: /^\/discover\/tv/,
  },
  {
    href: '/parties',
    label: 'Parties',
    svgIcon: <UserGroupIcon className="h-6 w-6" />,
    activeRegExp: /^\/parties/,
  },
  {
    href: '/requests',
    label: 'Requests',
    svgIcon: <ClockIcon className="h-6 w-6" />,
    activeRegExp: /^\/requests/,
  },
];

const adminLinks: SidebarLinkProps[] = [
  {
    href: '/blocklist',
    label: 'Blocklist',
    svgIcon: <EyeSlashIcon className="h-6 w-6" />,
    activeRegExp: /^\/blocklist/,
    requiredPermission: [Permission.MANAGE_BLOCKLIST, Permission.VIEW_BLOCKLIST],
    permissionType: 'or',
  },
  {
    href: '/issues',
    label: 'Issues',
    svgIcon: <ExclamationTriangleIcon className="h-6 w-6" />,
    activeRegExp: /^\/issues/,
    requiredPermission: [Permission.MANAGE_ISSUES, Permission.CREATE_ISSUES, Permission.VIEW_ISSUES],
    permissionType: 'or',
  },
  {
    href: '/users',
    label: 'Users',
    svgIcon: <ShieldCheckIcon className="h-6 w-6" />,
    activeRegExp: /^\/users/,
    requiredPermission: Permission.MANAGE_USERS,
  },
];

function SidebarContent({
  onLinkClick,
  pendingRequestsCount,
  openIssuesCount,
}: {
  onLinkClick?: () => void;
  pendingRequestsCount?: number;
  openIssuesCount?: number;
}) {
  const router = useRouter();
  const { hasPermission, user, revalidate } = useUser();
  const [adminExpanded, setAdminExpanded] = useState(false);

  const hasAdminLinks = adminLinks.some((link) =>
    link.requiredPermission
      ? hasPermission(link.requiredPermission, { type: link.permissionType ?? 'and' })
      : true
  );

  const handleLogout = async () => {
    const response = await axios.post('/api/v1/auth/logout');
    if (response.data?.status === 'ok') {
      revalidate();
    }
  };

  const renderLink = (link: SidebarLinkProps) => {
    const isActive = link.activeRegExp.test(router.pathname);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => onLinkClick?.()}
        className={`group relative flex items-center justify-center rounded-lg p-2 text-sm font-medium transition ${
          isActive
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
            : 'text-slate-300 hover:bg-dark-800 hover:text-white'
        }`}
      >
        {link.svgIcon}
        {link.label === 'Requests' && pendingRequestsCount && pendingRequestsCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-indigo-500" />
        )}
        {link.label === 'Issues' && openIssuesCount && openIssuesCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {openIssuesCount > 9 ? '9+' : openIssuesCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-center pt-4 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold text-white">J</div>
      </div>
      <div className="mt-4 flex flex-1 flex-col items-center gap-1 px-2">
        {navLinks.map(renderLink)}

        {hasAdminLinks && (
          <>
            <button
              onClick={() => setAdminExpanded(!adminExpanded)}
              className={`group relative flex items-center justify-center rounded-lg p-2 text-sm font-medium transition ${
                adminExpanded
                  ? 'bg-dark-800 text-white'
                  : 'text-slate-300 hover:bg-dark-800 hover:text-white'
              }`}
              title="Admin tools"
            >
              {adminExpanded ? (
                <WrenchScrewdriverIcon className="h-6 w-6" />
              ) : (
                <WrenchIcon className="h-6 w-6" />
              )}
            </button>

            <div
              className="flex flex-col items-center gap-1 overflow-hidden transition-all duration-200 ease-in-out"
              style={{ maxHeight: adminExpanded ? 200 : 0, opacity: adminExpanded ? 1 : 0, pointerEvents: adminExpanded ? 'auto' : 'none' }}
            >
              {adminLinks
                .filter((link) =>
                  link.requiredPermission
                    ? hasPermission(link.requiredPermission, { type: link.permissionType ?? 'and' })
                    : true
                )
                .map(renderLink)}
            </div>

            {hasPermission(Permission.ADMIN) && renderLink({
              href: '/settings',
              label: 'Settings',
              svgIcon: <CogIcon className="h-6 w-6" />,
              activeRegExp: /^\/settings/,
            })}
          </>
        )}
      </div>
      <div className="border-t border-dark-600 px-4 py-2">
        <div className="text-center text-xs text-slate-500">
          v{version}
        </div>
      </div>
      <div className="border-t border-dark-600 px-2 py-3">
        <Menu as="div" className="relative flex justify-center">
          <Menu.Button className="flex rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-dark-900">
            <CachedImage
              type="avatar"
              src={user?.avatar ?? ""}
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
                    <Link
                      href="/profile"
                      className={`${
                        active ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' : 'text-slate-300'
                      } group flex w-full items-center px-4 py-2 text-sm`}
                    >
                      <CogIcon className="mr-3 h-5 w-5" />
                      Profile Settings
                    </Link>
                  )}
                </Menu.Item>
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
      </div>
    </nav>
  );
}

const Sidebar = ({
  open,
  setClosed,
  pendingRequestsCount,
  openIssuesCount,
  revalidateIssueCount,
  revalidateRequestsCount,
  hidden: isHidden = false,
}: SidebarProps) => {
  return (
    <>
      {/* Mobile sidebar */}
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
            <div className="fixed inset-0 bg-dark opacity-90" onClick={setClosed} />
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
                  onClick={setClosed}
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
              <SidebarContent
                onLinkClick={setClosed}
                pendingRequestsCount={pendingRequestsCount}
                openIssuesCount={openIssuesCount}
              />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:w-20 lg:flex-col lg:z-40 ${isHidden ? 'hidden' : ''}`}>
        <div className="flex min-h-0 flex-1 flex-col border-r border-dark-600 bg-gradient-to-b from-dark-900 to-dark">
          <SidebarContent
            pendingRequestsCount={pendingRequestsCount}
            openIssuesCount={openIssuesCount}
          />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
