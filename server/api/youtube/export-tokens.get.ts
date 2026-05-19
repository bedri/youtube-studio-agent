export default defineEventHandler(async (event) => {
  // Strictly verify that the requester is the original owner (has the active browser cookie)
  const ownerCookie = getCookie(event, 'youtube_tokens')
  if (!ownerCookie) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Only the channel owner can export active session tokens.'
    })
  }

  try {
    const tokens = JSON.parse(ownerCookie)
    return {
      success: true,
      note: 'Copy the JSON string below and have your assistant paste it in their local .env as YOUTUBE_SHARED_TOKENS',
      tokenJson: JSON.stringify(tokens)
    }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process session tokens: ' + e.message
    })
  }
})
