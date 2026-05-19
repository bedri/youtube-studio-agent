import { google } from 'googleapis'

export const useYouTubeClient = () => {
  const config = useRuntimeConfig()
  
  const oauth2Client = new google.auth.OAuth2(
    config.youtubeClientId,
    config.youtubeClientSecret,
    config.youtubeRedirectUri
  )

  return {
    oauth2Client,
    youtube: google.youtube({ version: 'v3', auth: oauth2Client })
  }
}

export const getYouTubeTokens = async (event: any) => {
  const tokensRaw = getCookie(event, 'youtube_tokens')
  if (tokensRaw) {
    try {
      return JSON.parse(tokensRaw)
    } catch (e) {
      console.error('[YouTube Util] Failed to parse cookie tokens:', e)
    }
  }
  // Fallback to shared server-side tokens
  console.log('[YouTube Util] Cookie not found or invalid. Falling back to shared server tokens.')
  const cachedTokens = await useStorage('data').getItem('youtube:tokens')
  if (cachedTokens) return cachedTokens

  // Fallback to token configuration in environment variables / .env (for independent local setups)
  const config = useRuntimeConfig()
  if (config.youtubeSharedTokens) {
    try {
      console.log('[YouTube Util] Using shared credentials from environment configuration.')
      return JSON.parse(config.youtubeSharedTokens)
    } catch (e) {
      console.error('[YouTube Util] Failed to parse YOUTUBE_SHARED_TOKENS from environment config:', e)
    }
  }

  return null
}
