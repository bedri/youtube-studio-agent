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

    try {
      const channelId = channel.id
      if (channelId) {
        const storage = useStorage('data')
        const historyKey = `youtube:analytics_history:${channelId}`
        const history = (await storage.getItem(historyKey)) || []
        const lastEntry = history[history.length - 1]
        
        const views = parseInt(channel.statistics?.viewCount || '0')
        const subscribers = parseInt(channel.statistics?.subscriberCount || '0')
        const videos = parseInt(channel.statistics?.videoCount || '0')
        const today = new Date().toISOString().split('T')[0]
        
        if (!lastEntry || lastEntry.day !== today || lastEntry.views !== views || lastEntry.subscribers !== subscribers) {
          history.push({
            day: today,
            views,
            subscribers,
            videos,
            timestamp: new Date().toISOString()
          })
          if (history.length > 90) {
            history.shift()
          }
          await storage.setItem(historyKey, history)
        }
      }
    } catch (historyErr) {
      console.error('[API me] Failed to update analytics history:', historyErr)
    }
    
    return { 
      authenticated: true,
      isApiKey,
      channelId: channel?.id,
      channel: channel?.snippet,
      branding: channel?.brandingSettings,
      statistics: channel?.statistics
    }
  } catch (e) {
    console.error('[API me] Failed to fetch channel details:', e)
    return { authenticated: false }
  }
})
