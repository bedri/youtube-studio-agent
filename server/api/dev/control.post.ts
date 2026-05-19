export default defineEventHandler(async (event) => {
  const isDev = process.env.NODE_ENV === 'development'
  if (!isDev) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Developer tools are only available in development mode.'
    })
  }

  const body = await readBody(event)
  const { action, channelId } = body
  const storage = useStorage('data')

  if (action === 'get_system_info') {
    const memoryUsage = process.memoryUsage()
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      env: {
        port: process.env.PORT || '50555',
        nodeEnv: process.env.NODE_ENV
      }
    }
  }

  if (action === 'clear_cache') {
    await storage.removeItem('youtube:channel_info')
    await storage.removeItem('youtube:video_cache')
    if (channelId) {
      await storage.removeItem(`youtube:promotions:${channelId}`)
      await storage.removeItem(`youtube:analytics_history:${channelId}`)
    }
    return { success: true, message: 'All local caches cleared successfully.' }
  }

  if (action === 'seed_history') {
    if (!channelId) {
      return { success: false, message: 'Channel ID required for seeding.' }
    }
    
    // Seed 15 days of high-growth (1000 subs/day) mock nodes to database
    const historyKey = `youtube:analytics_history:${channelId}`
    const seedHistory = []
    const startSubs = 10000 // start from 10K 15 days ago
    const startViews = 50000

    for (let i = 15; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const d = date.toISOString().split('T')[0]
      
      // Calculate growth: e.g. 800 - 1200 subscribers per day
      const dailySubs = 800 + Math.round(Math.random() * 400)
      const dailyViews = dailySubs * 4 // 4 views per sub conversion

      const elapsedDays = 15 - i
      const totalSubs = startSubs + (elapsedDays * 1000) + Math.round(Math.random() * 500)
      const totalViews = startViews + (elapsedDays * 4000) + Math.round(Math.random() * 2000)

      seedHistory.push({
        day: d,
        views: totalViews,
        subscribers: totalSubs,
        videos: 290,
        timestamp: date.toISOString()
      })
    }

    await storage.setItem(historyKey, seedHistory)
    return { success: true, message: '15-day viral growth analytics seeded successfully.' }
  }

  if (action === 'shutdown') {
    setTimeout(() => {
      console.log('Shutting down dev server via Dev Console...')
      process.exit(0)
    }, 1000)
    return { success: true, message: 'Server shutdown initiated. The dev server process will terminate.' }
  }

  return { success: false, message: 'Unknown developer action.' }
})
