export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)
  const isOwner = !!getCookie(event, 'youtube_tokens') && !isApiKey

  // Find channel ID first
  let channelId = 'default'
  try {
    if (isApiKey) {
      channelId = getCookie(event, 'youtube_channel_id') || ''
    }
    if (!channelId || channelId === 'default') {
      const channelRes = await youtube.channels.list({
        part: ['snippet'],
        mine: !isApiKey ? true : undefined,
        id: isApiKey && channelId ? [channelId] : undefined
      })
      channelId = channelRes.data.items?.[0]?.id || 'default'
    }
  } catch (e) {
    console.error('Failed to resolve channel ID for promotions:', e)
  }

  const storage = useStorage('data')
  const promotionsKey = `youtube:promotions:${channelId}`
  let campaigns = (await storage.getItem(promotionsKey)) as any[] | null

  if (!campaigns) {
    // Fetch cached videos to assign mock campaigns
    let cachedVideos = (await storage.getItem('youtube:video_cache')) as any[] | null
    
    if (!cachedVideos || cachedVideos.length === 0) {
      // Fallback mock videos if cache is empty
      cachedVideos = [
        { id: 'mock1', snippet: { title: 'My Awesome Vlog', thumbnails: { default: { url: 'https://via.placeholder.com/120' } } }, status: { privacyStatus: 'public' } },
        { id: 'mock2', snippet: { title: 'Nuxt 4 Tutorial', thumbnails: { default: { url: 'https://via.placeholder.com/120' } } }, status: { privacyStatus: 'public' } }
      ]
    }

    if (!isOwner) {
      cachedVideos = cachedVideos.filter(v => v.status?.privacyStatus !== 'private')
    }

    // Generate mock promotions for all available videos to show all campaigns
    campaigns = cachedVideos.map((v, index) => {
      const status = index % 3 === 0 ? 'ACTIVE' : index % 3 === 1 ? 'PAUSED' : 'PENDING'
      return {
        id: `CAMP-DEMO-${index + 1001}`,
        videoId: v.id,
        videoTitle: v.snippet?.title || 'Untitled Video',
        thumbnailUrl: v.snippet?.thumbnails?.default?.url || '',
        status,
        dailyBudget: 10 + (index % 5) * 10,
        currencyCode: 'USD',
        impressions: 1200 + index * 450,
        clicks: 80 + index * 15,
        cost: 5.50 + index * 1.20,
        startDate: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + (10 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }
    })

    // Persist in local storage
    await storage.setItem(promotionsKey, campaigns)
  }

  return {
    campaigns,
    isDemoMode: true,
    message: 'Google Ads Developer Token is required for real campaign management. Displaying demo data.'
  }
})
