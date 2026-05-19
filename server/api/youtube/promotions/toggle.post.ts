import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { campaignId, status } = body

  if (!campaignId || !['ACTIVE', 'PAUSED'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid campaign ID or status.' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)

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
  const campaigns = ((await storage.getItem(promotionsKey)) as any[]) || []
  
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId)
  if (campaignIndex === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  }

  campaigns[campaignIndex].status = status
  await storage.setItem(promotionsKey, campaigns)

  return {
    success: true,
    message: 'Campaign status updated successfully.',
    campaign: campaigns[campaignIndex]
  }
})
