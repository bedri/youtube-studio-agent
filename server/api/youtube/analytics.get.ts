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

    // Map history entries by day for fast lookup
    const historyMap = new Map()
    history.forEach((entry: any) => {
      historyMap.set(entry.day, entry)
    })

    // Compute measured daily growth from history to use as base for simulation
    let measuredDailyViews = 0
    let measuredDailySubs = 0
    let measurementsCount = 0

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1]
      const curr = history[i]
      const diffViews = curr.views - prev.views
      const diffSubs = curr.subscribers - prev.subscribers
      if (diffViews >= 0 && diffSubs >= 0) {
        measuredDailyViews += diffViews
        measuredDailySubs += diffSubs
        measurementsCount++
      }
    }

    let baseDailyViews = Math.max(120, Math.round(totalSubs * 0.08))
    // If the channel has high subscriber counts (viral status >10k subs),
    // we use a high-growth rate of 4.6% to match the ~1000 subs/day growth scale.
    let baseDailySubs = Math.max(3, Math.round(totalSubs * (totalSubs > 10000 ? 0.046 : 0.004)))

    if (measurementsCount > 0) {
      baseDailyViews = Math.round(measuredDailyViews / measurementsCount)
      baseDailySubs = Math.round(measuredDailySubs / measurementsCount)
    }

    const dailyData = []
    for (let i = 15; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const d = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      // Check if we have real history data for this day
      const todayEntry = historyMap.get(d)
      if (todayEntry) {
        // Find the closest entry in history before todayEntry
        const prevEntry = history
          .filter((entry: any) => entry.day < d)
          .sort((a: any, b: any) => b.day.localeCompare(a.day))[0]

        if (prevEntry) {
          const daysDiff = (new Date(d).getTime() - new Date(prevEntry.day).getTime()) / (24 * 60 * 60 * 1000)
          const views = Math.round(Math.max(0, todayEntry.views - prevEntry.views) / Math.max(1, daysDiff))
          const subscribersGained = Math.round(Math.max(0, todayEntry.subscribers - prevEntry.subscribers) / Math.max(1, daysDiff))
          const watchTime = Math.round(views * 3.5)

          dailyData.push({
            day: d,
            views,
            watchTime,
            avgViewDuration: 210,
            subscribersGained,
            isRealData: true
          })
          continue
        }
      }

      // Fallback to organic simulation matching the base rate
      const cycleFactor = 1.0 + 0.2 * Math.sin((dayOfWeek - 3) * (Math.PI / 3.5))
      const noiseFactor = 0.85 + Math.random() * 0.30
      
      const views = Math.round(baseDailyViews * cycleFactor * noiseFactor)
      const subscribersGained = Math.round(baseDailySubs * cycleFactor * noiseFactor * (0.8 + Math.random() * 0.4))
      const watchTime = Math.round(views * (2.8 + Math.random() * 1.4))

      dailyData.push({
        day: d,
        views,
        watchTime,
        avgViewDuration: Math.round(160 + Math.random() * 50),
        subscribersGained,
        isRealData: false
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
