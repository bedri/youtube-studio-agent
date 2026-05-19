import { defineEventHandler, createError, getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtubeAnalytics, isApiKey } = useYouTubeClient(event, tokens)

  if (isApiKey) {
    // API keys cannot access YouTube Analytics API.
    return {
      dailyData: [],
      trafficData: [],
      error: 'Analytics API requires OAuth login. API Key is not sufficient.'
    }
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
    
    // Map the returned columns to our object structure
    // Expected row: [ "YYYY-MM-DD", views, estimatedMinutesWatched, averageViewDuration, subscribersGained ]
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
    
    // If we get an error about insufficient scopes, we handle it explicitly
    if (error.message?.includes('insufficient')) {
      return {
        dailyData: [],
        trafficData: [],
        error: 'YouTube Analytics API scope is missing. Please logout and log back in.'
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch analytics from YouTube'
    })
  }
})
