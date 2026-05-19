export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) return { authenticated: false }
  
  try {
    const { youtube, isApiKey } = useYouTubeClient(event, tokens)
    
    let channelRes
    if (isApiKey) {
      const channelId = getCookie(event, 'youtube_channel_id')
      if (!channelId) {
        return { authenticated: false, error: 'Channel ID required for API Key authentication.' }
      }
      channelRes = await youtube.channels.list({
        part: ['snippet', 'brandingSettings', 'statistics'],
        id: [channelId]
      })
    } else {
      channelRes = await youtube.channels.list({
        part: ['snippet', 'brandingSettings', 'statistics'],
        mine: true
      })
    }
    
    const channel = channelRes.data.items?.[0]
    if (!channel) return { authenticated: false }
    
    return { 
      authenticated: true,
      isApiKey,
      channel: channel?.snippet,
      branding: channel?.brandingSettings,
      statistics: channel?.statistics
    }
  } catch (e) {
    console.error('[API me] Failed to fetch channel details:', e)
    return { authenticated: false }
  }
})
