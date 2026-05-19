export default defineEventHandler(async (event) => {
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const isOwner = !!getCookie(event, 'youtube_tokens')
  
  // NOTE: Google Ads API integration requires a separate library (@google-ads/google-ads)
  // and a Developer Token. For this version, we provide a sophisticated mock to demonstrate
  // the capability and UI until the user provides a Google Ads Developer Token.

  // Fetch some public videos to assign mock campaigns to them
  let cachedVideos = await useStorage('data').getItem('youtube:video_cache') as any[] | null
  
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

  // Select top 2 videos for mock active campaigns if available
  const activeVideos = cachedVideos.slice(0, 2)

  const campaigns = activeVideos.map((v, index) => {
    return {
      id: `CAMP-DEMO-${index + 1001}`,
      videoId: v.id,
      videoTitle: v.snippet?.title,
      thumbnailUrl: v.snippet?.thumbnails?.default?.url,
      status: index === 0 ? 'ACTIVE' : 'PAUSED',
      dailyBudget: index === 0 ? 50 : 20,
      currencyCode: 'USD',
      impressions: index === 0 ? 14520 : 3200,
      clicks: index === 0 ? 430 : 85,
      cost: index === 0 ? 12.50 : 4.20,
      startDate: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + (10 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  })

  return {
    campaigns,
    isDemoMode: true,
    message: 'Google Ads Developer Token is required for real campaign management. Displaying demo data.'
  }
})
