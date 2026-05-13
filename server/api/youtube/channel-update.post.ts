import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
  const { title, description } = await readBody(event)
  
  const session = await getSession(event, { password: process.env.SESSION_PASSWORD || 'default_session_password_32_chars_long' })
  if (!session.data.tokens) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  )
  oauth2Client.setCredentials(session.data.tokens)

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  try {
    // 1. Get current channel info to get existing snippet
    const channelRes = await youtube.channels.list({
      mine: true,
      part: ['snippet']
    })

    const channel = channelRes.data.items?.[0]
    if (!channel || !channel.snippet) {
      throw createError({ statusCode: 404, message: 'Channel not found' })
    }

    // 2. Update channel
    const updateBody: any = {
      id: channel.id,
      snippet: {
        ...channel.snippet
      }
    }

    if (title) updateBody.snippet.title = title
    if (description) updateBody.snippet.description = description

    await youtube.channels.update({
      part: ['snippet'],
      requestBody: updateBody
    })

    return { success: true }
  } catch (error: any) {
    console.error('Channel update error:', error.message)
    throw createError({ statusCode: 500, message: error.message })
  }
})
