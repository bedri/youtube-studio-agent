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
