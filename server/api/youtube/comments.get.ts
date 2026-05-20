import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const videoId = extractStringValue(query.videoId)

  if (!videoId) {
    throw createError({ statusCode: 400, statusMessage: 'videoId query parameter is required' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube } = useYouTubeClient(event, tokens)

  try {
    const response = await youtube.commentThreads.list({
      part: ['snippet'],
      videoId: videoId,
      maxResults: 20,
      order: 'relevance'
    })

    const items = response.data.items || []

    return items.map((item: any) => {
      const topComment = item.snippet?.topLevelComment?.snippet
      return {
        id: item.id || '',
        commentId: item.snippet?.topLevelComment?.id || '',
        author: topComment?.authorDisplayName || 'Anonymous',
        authorChannelUrl: topComment?.authorChannelUrl || '',
        authorProfileImageUrl: topComment?.authorProfileImageUrl || '',
        text: topComment?.textOriginal || topComment?.textDisplay || '',
        publishedAt: topComment?.publishedAt || '',
        replyCount: item.snippet?.totalReplyCount || 0
      }
    })
  } catch (error: any) {
    console.error('[Comments Get API] Failed to fetch comment threads:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch comments: ${error.message}`
    })
  }
})
