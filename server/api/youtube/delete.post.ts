import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
  const { videoIds } = await readBody(event)
  if (!videoIds || !Array.isArray(videoIds)) {
    throw createError({ statusCode: 400, message: 'Invalid video IDs' })
  }

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

  console.log('Batch delete starting for:', videoIds.length, 'videos')

  const results = []
  for (const videoId of videoIds) {
    try {
      await youtube.videos.delete({ id: videoId })
      results.push({ id: videoId, status: 'success' })
      console.log('Deleted video:', videoId)
    } catch (error: any) {
      console.error(`Error deleting video ${videoId}:`, error.message)
      results.push({ id: videoId, status: 'error', message: error.message })
    }
  }

  return { success: true, results }
})
