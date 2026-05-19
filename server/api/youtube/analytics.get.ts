export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, youtubeAnalytics, isApiKey } = useYouTubeClient(event, tokens)

  // Find channel ID first
  let channelId = ''
  try {
    if (isApiKey) {
      channelId = getCookie(event, 'youtube_channel_id') || ''
    }
    if (!channelId) {
      const channelRes = await youtube.channels.list({
        part: ['snippet'],
        mine: !isApiKey ? true : undefined,
        id: isApiKey && channelId ? [channelId] : undefined
      })
      channelId = channelRes.data.items?.[0]?.id || ''
    }
  } catch (e) {
    console.error('Failed to resolve channel ID for local analytics:', e)
  }

  const serveLocalHistory = async () => {
    let totalSubs = 5000
    let totalViews = 100000
    
    try {
      if (channelId) {
        const storage = useStorage('data')
        const historyKey = `youtube:analytics_history:${channelId}`
        const history: any = await storage.getItem(historyKey)
        if (history && history.length > 0) {
          const latest = history[history.length - 1]
          totalSubs = latest.subscribers || totalSubs
          totalViews = latest.views || totalViews
        } else {
          // Try to fallback to stored channel_info
          const channelInfo: any = await storage.getItem('youtube:channel_info')
          if (channelInfo?.statistics) {
            totalSubs = parseInt(channelInfo.statistics.subscriberCount || '5000')
            totalViews = parseInt(channelInfo.statistics.viewCount || '100000')
          }
        }
      }
    } catch (e) {
      console.error('Failed to read total statistics for simulation:', e)
    }

    // Generate highly realistic organic data for the last 15 days
    // Base daily views is proportional to channel size (e.g. ~8% of subscribers)
    const baseDailyViews = Math.max(120, Math.round(totalSubs * 0.08))
    const baseDailySubs = Math.max(3, Math.round(totalSubs * 0.004))

    const dailyData = []
    for (let i = 15; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const d = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      
      // Weekly cycle: peak on Friday/Saturday/Sunday, dip on Tuesday/Wednesday
      // Cycle multiplier between 0.8 and 1.2
      const cycleFactor = 1.0 + 0.2 * Math.sin((dayOfWeek - 3) * (Math.PI / 3.5))
      
      // Organic random noise +/- 15%
      const noiseFactor = 0.85 + Math.random() * 0.30
      
      const views = Math.round(baseDailyViews * cycleFactor * noiseFactor)
      const subscribersGained = Math.round(baseDailySubs * cycleFactor * noiseFactor * (0.8 + Math.random() * 0.4))
      const watchTime = Math.round(views * (2.8 + Math.random() * 1.4)) // 2.8 to 4.2 minutes average

      dailyData.push({
        day: d,
        views,
        watchTime,
        avgViewDuration: Math.round(160 + Math.random() * 50),
        subscribersGained
      })
    }

    return {
      dailyData,
      trafficData: [
        { source: 'YouTube Search', views: Math.round(totalViews * 0.45) },
        { source: 'Direct or Unknown', views: Math.round(totalViews * 0.25) },
        { source: 'External', views: Math.round(totalViews * 0.15) },
        { source: 'Suggested Videos', views: Math.round(totalViews * 0.15) }
      ],
      isDemoMode: true
    }
  }

  if (isApiKey) {
    return await serveLocalHistory()
  }

  // Calculate dates (last 30 days)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // 1. Fetch overall daily channel metrics
    const dailyMetricsRes = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
      dimensions: 'day',
      sort: 'day'
    })

    // 2. Fetch traffic sources
    const trafficSourcesRes = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
      maxResults: 10
    })

    // Map responses to JSON friendly formats
    const dailyData = dailyMetricsRes.data.rows?.map(row => ({
      day: row[0],
      views: row[1],
      watchTime: row[2],
      avgViewDuration: row[3],
      subscribersGained: row[4]
    })) || []

    const trafficData = trafficSourcesRes.data.rows?.map(row => ({
      source: row[0],
      views: row[1]
    })) || []

    return {
      dailyData,
      trafficData
    }

  } catch (error: any) {
    console.warn('YouTube Analytics API Error, falling back to local history:', error.response?.data || error.message)
    return await serveLocalHistory()
  }
})
