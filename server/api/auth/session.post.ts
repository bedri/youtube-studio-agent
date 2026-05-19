export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  if (body.action === 'logout') {
    deleteCookie(event, 'youtube_tokens')
    deleteCookie(event, 'youtube_api_key')
    deleteCookie(event, 'youtube_channel_id')
    return { success: true }
  }

  const { tokens, apiKey } = body

  if (tokens) {
    let tokensObj = tokens
    if (typeof tokens === 'string') {
      try {
        tokensObj = JSON.parse(tokens)
      } catch (e) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid Tokens JSON string'
        })
      }
    }

    setCookie(event, 'youtube_tokens', JSON.stringify(tokensObj), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })
    deleteCookie(event, 'youtube_api_key')
    return { success: true, type: 'tokens' }
  }

  if (apiKey) {
    setCookie(event, 'youtube_api_key', apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })
    if (body.channelId) {
      setCookie(event, 'youtube_channel_id', body.channelId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })
    }
    deleteCookie(event, 'youtube_tokens')
    return { success: true, type: 'apiKey' }
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Provide either tokens or apiKey'
  })
})
