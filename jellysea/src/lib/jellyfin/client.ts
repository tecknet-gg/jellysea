import axios from 'axios'

const jellyfinApi = axios.create({
  baseURL: '/api/jf',
  timeout: 30000,
  headers: {
    'X-Emby-Client': 'Jellysea',
    'X-Emby-Client-Version': '0.1.3',
    'X-Emby-Device-Name': 'Jellyfin Web',
    'X-Emby-Device-Id': 'jellysea-web-' + (typeof window !== 'undefined' ? Math.random().toString(36).slice(2) : 'server'),
  },
})

jellyfinApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jellyfinAccessToken')
    if (token) {
      config.headers['X-MediaBrowser-Token'] = token
      if (config.params) {
        config.params.api_key = token
      } else {
        config.params = { api_key: token }
      }
    }
  }
  return config
})

export default jellyfinApi
