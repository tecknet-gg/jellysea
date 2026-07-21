import PullToRefresh from '@app/components/Layout/PullToRefresh';
import SearchInput from '@app/components/Layout/SearchInput';
import Sidebar from '@app/components/Layout/Sidebar';
import UserWarnings from '@app/components/Layout/UserWarnings';
import { usePlayer } from '@app/context/PlayerContext';
import useLocale from '@app/hooks/useLocale';
import useSettings from '@app/hooks/useSettings';
import { useUser } from '@app/hooks/useUser';
import { Bars3BottomLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { AvailableLocale } from '@server/types/languages';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { playerActive } = usePlayer();
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useUser();
  const { currentSettings } = useSettings();
  const { setLocale } = useLocale();
  const { data: requestResponse, mutate: revalidateRequestsCount } = useSWR(
    '/api/v1/request/count',
    {
      revalidateOnMount: true,
    }
  );
  const { data: issueResponse, mutate: revalidateIssueCount } = useSWR(
    '/api/v1/issue/count',
    {
      revalidateOnMount: true,
    }
  );

  useEffect(() => {
    if (setLocale && user) {
      setLocale(
        (user?.settings?.locale
          ? user.settings.locale
          : currentSettings.locale) as AvailableLocale
      );
    }
  }, [setLocale, currentSettings.locale, user]);

  useEffect(() => {
    const updateScrolled = () => {
      if (window.pageYOffset > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', updateScrolled, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrolled);
    };
  }, []);

  return (
    <div className="flex h-full min-h-full min-w-0 bg-dark">
      <Sidebar
        open={isSidebarOpen && !playerActive}
        setClosed={() => setSidebarOpen(false)}
        pendingRequestsCount={requestResponse?.pending ?? 0}
        openIssuesCount={issueResponse?.open ?? 0}
        revalidateIssueCount={() => revalidateIssueCount()}
        revalidateRequestsCount={() => revalidateRequestsCount()}
        hidden={playerActive}
      />

      <div className="relative mb-16 flex w-0 min-w-0 flex-1 flex-col lg:ml-20">
        <PullToRefresh />
        <div
          className={`searchbar fixed left-0 right-0 top-0 z-10 flex flex-shrink-0 items-center px-4 transition ${
            isScrolled ? 'bg-dark-800/80' : 'bg-transparent'
          } lg:left-20 ${playerActive ? 'hidden' : ''}`}
          style={{
            height: 'calc(4rem + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)',
            backdropFilter: isScrolled ? 'blur(5px)' : undefined,
          }}
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
          <div className="flex items-center">
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-white transition"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <main className="relative top-16 z-0 focus:outline-none" tabIndex={0}>
          <div className="mb-6">
            <div className="mx-auto max-w-8xl px-4">
              <UserWarnings />
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
