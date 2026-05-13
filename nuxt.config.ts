// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-13',
  future: {
    compatibilityVersion: 4,
  },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui'],
  runtimeConfig: {
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: process.env.YOUTUBE_REDIRECT_URI,
    public: {
      // Public vars if any
    }
  },
  nitro: {
    scanDirs: ['../server']
  },
  devtools: { enabled: true }
})
