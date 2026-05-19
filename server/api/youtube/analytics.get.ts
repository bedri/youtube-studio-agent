import { defineEventHandler, createError, getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, youtubeAnalytics, isApiKey } = useYouTubeClient(event, tokens)

  // Helper to serve simulated (mock) analytics data in case real API fails or is not enabled
  const serveMockAnalytics = async (errorMessage?: string) => {
    let totalSubs = 5000
    let totalViews = 100000
    let history: any[] = []
    
    try {
      let channelId = ''
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

      if (channelId) {
        const storage = useStorage('data')
        const historyKey = `youtube:analytics_history:${channelId}`
        const fetchedHistory: any = await storage.getItem(historyKey)
        if (fetchedHistory && fetchedHistory.length > 0) {
          history = fetchedHistory
          const latest = history[history.length - 1]
          totalSubs = latest.subscribers || totalSubs
          totalViews = latest.views || totalViews
        } else {
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

    const historyMap = new Map()
    history.forEach((entry: any) => {
      historyMap.set(entry.day, entry)
    })

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
    let baseDailySubs = Math.max(3, Math.round(totalSubs * (totalSubs > 10000 ? 0.046 : 0.004)))

    if (measurementsCount > 0) {
      baseDailyViews = Math.round(measuredDailyViews / measurementsCount)
      baseDailySubs = Math.round(measuredDailySubs / measurementsCount)
    }

    const dailyData = []
    for (let i = 15; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const d = date.toISOString().split('T')[0] || ''
      const dayOfWeek = date.getDay()

      const todayEntry = historyMap.get(d)
      if (todayEntry) {
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
        { source: 'YT_SEARCH', views: Math.round(totalViews * 0.55) },
        { source: 'DIRECT', views: Math.round(totalViews * 0.20) },
        { source: 'EXT_URL', views: Math.round(totalViews * 0.15) },
        { source: 'RELATED_VIDEO', views: Math.round(totalViews * 0.10) }
      ],
      error: errorMessage || 'Simulated data is being shown.'
    }
  }

  if (isApiKey) {
    return serveMockAnalytics('Analytics API requires OAuth login. Showing simulated data.')
  }

  // Calculate startDate (14 days ago) and endDate (today)
  const endDateStr = new Date().toISOString().split('T')[0]
  const startDateStr = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    // 1. Time-series Daily Data
    const dailyRes = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: startDateStr,
      endDate: endDateStr,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
      dimensions: 'day',
      sort: 'day'
    })

    const dailyData: any[] = []
    const rows = dailyRes.data.rows || []
    
    for (const row of rows) {
      dailyData.push({
        day: row[0],
        views: row[1] || 0,
        watchTime: row[2] || 0,
        avgViewDuration: row[3] || 0,
        subscribersGained: row[4] || 0,
        isRealData: true
      })
    }

    // 2. Traffic Sources Data
    const trafficRes = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: startDateStr,
      endDate: endDateStr,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
      maxResults: 6
    })

    const trafficData: any[] = []
    const tRows = trafficRes.data.rows || []
    
    for (const row of tRows) {
      trafficData.push({
        source: row[0],
        views: row[1] || 0
      })
    }

    return {
      dailyData,
      trafficData
    }
  } catch (error: any) {
    console.error('YouTube Analytics API Error:', error)
    
    let cleanMessage = error.message || 'Failed to fetch analytics from YouTube'
    if (cleanMessage.includes('disabled') || cleanMessage.includes('has not been used')) {
      cleanMessage = 'YouTube Analytics API projenizde aktif değil. Lütfen Google Cloud Developer Console üzerinden aktif hale getirin: https://console.developers.google.com/apis/api/youtubeanalytics.googleapis.com/overview?project=3347798040'
    } else if (cleanMessage.includes('insufficient')) {
      cleanMessage = 'Gelişmiş YouTube Analytics API izinleri eksik. Lütfen çıkış yapıp tekrar Google hesabı ile giriş yapın.'
    }

    // Instead of throwing a 500 error, return simulated mock data with the error explanation!
    return serveMockAnalytics(cleanMessage)
  }
})
