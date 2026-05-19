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
    campaigns = []
    await storage.setItem(promotionsKey, campaigns)
  }

  return {
    campaigns,
    isDemoMode: true,
    message: 'Bu panel şu an için bir önizlemedir. Gerçek reklam entegrasyonları için Google Ads bağlantısı çok yakında eklenecektir.'
  }
})
