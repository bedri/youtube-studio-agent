export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) return { authenticated: false }
  
  try {
    const { oauth2Client, youtube } = useYouTubeClient()
    oauth2Client.setCredentials(tokens)
    
    const channelRes = await youtube.channels.list({
      part: ['snippet', 'brandingSettings', 'statistics'],
      mine: true
    })
    
    const channel = channelRes.data.items?.[0]
    
    return { 
      authenticated: true, 
      channel: channel?.snippet,
      branding: channel?.brandingSettings,
      statistics: channel?.statistics
    }
  } catch (e) {
    return { authenticated: false }
  }
})
