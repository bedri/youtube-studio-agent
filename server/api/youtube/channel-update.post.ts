import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
  const { title, description } = await readBody(event)
  
  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { oauth2Client, youtube } = useYouTubeClient()
  oauth2Client.setCredentials(tokens)

  try {
    // 1. Get current channel info
    const channelRes = await youtube.channels.list({
      mine: true,
      part: ['snippet', 'brandingSettings']
    })

    const channel = channelRes.data.items?.[0]
    if (!channel || !channel.snippet) {
      throw createError({ statusCode: 404, message: 'Channel not found' })
    }

    // 2. Update channel sequentially to avoid 'invalidPart' error
    // YouTube Data API strictly forbids combining brandingSettings with other parts like snippet
    if (title !== undefined && title !== channel.snippet.title) {
      await youtube.channels.update({
        part: ['snippet'],
        requestBody: {
          id: channel.id,
          snippet: {
            ...channel.snippet,
            title: title
          }
        }
      })
    }

    if (description !== undefined && description !== channel.brandingSettings?.channel?.description) {
      await youtube.channels.update({
        part: ['brandingSettings'],
        requestBody: {
          id: channel.id,
          brandingSettings: {
            ...channel.brandingSettings,
            channel: {
              ...channel.brandingSettings?.channel,
              description: description
            }
          }
        }
      })
    }

    return { success: true }
  } catch (error: any) {
    const errorDetail = error.response?.data?.error || error.message
    const errorMessage = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail, null, 2)
    console.error('YOUTUBE_API_ERROR_DETAIL:', errorMessage)
    throw createError({ 
      statusCode: error.response?.status || 500, 
      message: errorMessage
    })
  }
})
