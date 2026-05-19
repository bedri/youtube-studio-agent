export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { oauth2Client, youtubeAnalytics, youtube } = useYouTubeClient()
  oauth2Client.setCredentials(tokens)

  const isOwner = !!getCookie(event, 'youtube_tokens')

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
    console.error('YouTube Analytics API Error:', error.response?.data || error.message)
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: 'Failed to fetch analytics: ' + (error.response?.data?.error?.message || error.message)
    })
  }
})
