export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { videoId, dailyBudget, durationDays, targetLocations } = body

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

  // Validate the video existence and privacy status
  const storage = useStorage('data')
  let cachedVideos = (await storage.getItem('youtube:video_cache')) as any[] | null
  const video = cachedVideos?.find(v => v.id === videoId)

  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Video not found' })
  }

  if (video.status?.privacyStatus === 'private' && !isOwner) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot promote a private video.' })
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const newCampaign = {
    id: `CAMP-DEMO-${Math.floor(Math.random() * 10000)}`,
    videoId,
    videoTitle: video.snippet?.title || 'Untitled Video',
    thumbnailUrl: video.snippet?.thumbnails?.default?.url || '',
    status: 'ACTIVE',
    dailyBudget: parseFloat(dailyBudget || '10'),
    currencyCode: 'USD',
    impressions: 0,
    clicks: 0,
    cost: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + parseInt(durationDays || '7') * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }

  const promotionsKey = `youtube:promotions:${channelId}`
  const campaigns = ((await storage.getItem(promotionsKey)) as any[]) || []
  campaigns.unshift(newCampaign)
  await storage.setItem(promotionsKey, campaigns)

  return {
    success: true,
    message: 'Promotion campaign successfully mocked and launched!',
    campaign: newCampaign,
    isDemoMode: true
  }
})
