import TopNav from '@app/components/Layout/TopNav'
import PullToRefresh from '@app/components/Layout/PullToRefresh'
import UserWarnings from '@app/components/Layout/UserWarnings'
import { usePlayer } from '@app/context/PlayerContext'
import useLocale from '@app/hooks/useLocale'
import useSettings from '@app/hooks/useSettings'
import { useUser } from '@app/hooks/useUser'
import { useRouter } from 'next/router'
import type { AvailableLocale } from '@server/types/languages'
import { useEffect } from 'react'

type LayoutProps = {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { playerActive } = usePlayer()
  const router = useRouter()
  const { user } = useUser()
  const { currentSettings } = useSettings()
  const { setLocale } = useLocale()

  useEffect(() => {
    if (setLocale && user) {
      setLocale(
        (user?.settings?.locale
          ? user.settings.locale
          : currentSettings.locale) as AvailableLocale
      )
    }
  }, [setLocale, currentSettings.locale, user])

  const isAuthPage = router.pathname.match(/(login|setup|resetpassword)/)
  const isWatchPage = router.pathname.startsWith('/watch')

  if (isAuthPage || isWatchPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col bg-midnight-900">
      <TopNav />

      <PullToRefresh />

      <main
        className={`flex-1 focus:outline-none ${
          playerActive ? '' : 'pt-16 lg:pt-16'
        }`}
      >
        <div className="mx-auto max-w-8xl px-4 pb-24 lg:pb-6">
          <UserWarnings />
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
