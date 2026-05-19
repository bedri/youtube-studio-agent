export default defineEventHandler(async (event) => {
  const { videoIds } = await readBody(event)
  if (!videoIds || !Array.isArray(videoIds)) {
    throw createError({ statusCode: 400, message: 'Invalid video IDs' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)
  if (isApiKey) {
    throw createError({ statusCode: 403, message: 'Write operations are forbidden with API Key authentication.' })
  }

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
