import { google } from 'googleapis'

export const useYouTubeClient = (event?: any, tokens?: any) => {
  const config = useRuntimeConfig()
  
  const oauth2Client = new google.auth.OAuth2(
    config.youtubeClientId,
    config.youtubeClientSecret,
    config.youtubeRedirectUri
  )

  let auth: any = oauth2Client
  let isApiKey = false

  if (tokens && tokens.apiKey) {
    auth = tokens.apiKey
    isApiKey = true
  } else if (event) {
    const apiKey = getCookie(event, 'youtube_api_key')
    if (apiKey) {
      auth = apiKey
      isApiKey = true
    }
  }

  if (!isApiKey && tokens) {
    try {
      oauth2Client.setCredentials(tokens)
    } catch (e) {
      console.error('[YouTube Util] Failed to set credentials:', e)
    }
  }

  return {
    oauth2Client,
    youtube: google.youtube({ version: 'v3', auth }),
    youtubeAnalytics: google.youtubeAnalytics({ version: 'v2', auth }),
    isApiKey
  }
}

export const getYouTubeTokens = async (event: any) => {
  // Check if API key cookie exists first
  const apiKey = getCookie(event, 'youtube_api_key')
  if (apiKey) {
    return { apiKey }
  }

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
