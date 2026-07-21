import type { AppProps } from 'next/app'
import { SWRConfig } from 'swr'
import api from '@/utils/api'
import Layout from '@/components/Layout'
import '@/styles/globals.css'

const authPages = ['/login', '/setup', '/resetpassword']
const fullscreenPages = ['/watch']

export default function App({ Component, pageProps, router }: AppProps) {
  const isAuthPage = authPages.some((p) => router.pathname.startsWith(p))
  const isFullscreenPage = fullscreenPages.some((p) => router.pathname.startsWith(p))

  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => api.get(url).then((res) => res.data),
      }}
    >
      {isAuthPage || isFullscreenPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </SWRConfig>
  )
}