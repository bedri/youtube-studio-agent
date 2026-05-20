import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const videoId = extractStringValue(body.videoId)
  const targetLang = extractStringValue(body.targetLang)
  const title = body.title
  const description = body.description

  if (!videoId || !targetLang || !title) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)

  if (isApiKey) {
    throw createError({ statusCode: 403, statusMessage: 'API Key access cannot modify videos. OAuth required.' })
  }

  try {
    // 1. Fetch current video to get existing localizations
    const videoRes = await youtube.videos.list({
      part: ['id', 'localizations'],
      id: [videoId]
    })

    const video = videoRes.data.items?.[0]
    if (!video) {
      throw createError({ statusCode: 404, statusMessage: 'Video not found' })
    }

    // 2. Prepare new localizations object by merging existing ones
    const currentLocalizations = video.localizations || {}
    
    const newLocalizations = {
      ...currentLocalizations,
      [targetLang]: {
        title,
        description: description || ''
      }
    }

    // 3. Update the video on YouTube
    const updateRes = await youtube.videos.update({
      part: ['id', 'localizations'],
      requestBody: {
        id: videoId,
        localizations: newLocalizations
      }
    })

    return {
      success: true,
      message: 'Video localized successfully',
      localizations: updateRes.data.localizations
    }

  } catch (error: any) {
    console.error('Failed to update localizations:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update video localizations'
    })
  }
})
