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
  return await useStorage('data').getItem('youtube:tokens')
}
