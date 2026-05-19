import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { commentId, replyText } = body

  if (!commentId || !replyText) {
    throw createError({ statusCode: 400, statusMessage: 'commentId and replyText are required' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)
  if (isApiKey) {
    throw createError({ statusCode: 403, statusMessage: 'Write operations are forbidden with API Key authentication.' })
  }

  try {
    const response = await youtube.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: replyText
        }
      }
    })

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[Comment Reply API] Failed to post reply:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to post reply: ${error.message}`
    })
  }
})
