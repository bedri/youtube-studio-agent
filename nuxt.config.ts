// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-13',
  future: {
    compatibilityVersion: 4,
  },
  app: {
    head: {
      title: 'YouTube Batch Agent',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui'],
  runtimeConfig: {
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
    youtubeSharedTokens: process.env.YOUTUBE_SHARED_TOKENS,
    public: {
      // Public vars if any
    }
  },
  nitro: {
    scanDirs: ['../server'],
    storage: {
      data: {
        driver: 'fs',
        base: './.data/storage'
      }
    }
  },
  devtools: { enabled: true }
})
