export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code'
    })
  }

  const { oauth2Client } = useYouTubeClient()
  const { tokens } = await oauth2Client.getToken(code)

  // Store tokens in a secure cookie
  setCookie(event, 'youtube_tokens', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })

  return sendRedirect(event, '/')
})
