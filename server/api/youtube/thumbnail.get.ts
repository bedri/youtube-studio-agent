export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const videoId = extractStringValue(query.id)

  if (!videoId) {
    throw createError({ statusCode: 400, statusMessage: 'Video ID is required' })
  }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const isOwner = !!getCookie(event, 'youtube_tokens')

  // 1. Check video cache first to see if we have a cached thumbnail URL
  let cachedVideos = await useStorage('data').getItem('youtube:video_cache') as any[] | null
  const cachedVideo = cachedVideos?.find(v => v.id === videoId)
  
  // Prevent assistant from accessing private video thumbnails
  if (cachedVideo && cachedVideo.status?.privacyStatus === 'private' && !isOwner) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Private video thumbnail access denied for assistant' })
  }

  const cachedUrl = cachedVideo?.snippet?.thumbnails?.medium?.url || cachedVideo?.snippet?.thumbnails?.default?.url

  let response: Response | null = null
  let success = false

  // 2. Try fetching the cached URL
  if (cachedUrl) {
    try {
      console.log(`[Thumbnail Proxy] Trying cached URL for video: ${videoId}`)
      response = await fetch(cachedUrl)
      if (response.ok) {
        success = true
        console.log(`[Thumbnail Proxy] Cached URL is valid for video: ${videoId}`)
      } else {
        console.warn(`[Thumbnail Proxy] Cached URL returned status ${response.status} for video: ${videoId}`)
      }
    } catch (e) {
      console.error(`[Thumbnail Proxy] Failed to fetch cached URL for video ${videoId}:`, e)
    }
  }

  // 3. Self-healing flow: if the cached URL is invalid or missing, fetch a fresh one from the YouTube API
  if (!success) {
    console.log(`[Thumbnail Proxy] Triggering self-healing for video: ${videoId}`)
    const { oauth2Client, youtube } = useYouTubeClient()
    oauth2Client.setCredentials(tokens)

    try {
      const videoRes = await youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      })

      const freshVideo = videoRes.data.items?.[0]
      if (!freshVideo) {
        throw createError({ statusCode: 404, statusMessage: 'Video not found on YouTube' })
      }

      // Prevent assistant from accessing private video thumbnails
      if (freshVideo.status?.privacyStatus === 'private' && !isOwner) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: Private video thumbnail access denied for assistant' })
      }

      // Update the cache with the updated snippet (containing the fresh, signed thumbnail URLs)
      if (cachedVideos) {
        const index = cachedVideos.findIndex(v => v.id === videoId)
        if (index !== -1) {
          cachedVideos[index].snippet = freshVideo.snippet
        } else {
          cachedVideos.push(freshVideo)
        }
        await useStorage('data').setItem('youtube:video_cache', cachedVideos)
      }

      const freshUrl = freshVideo.snippet?.thumbnails?.medium?.url || freshVideo.snippet?.thumbnails?.default?.url
      if (!freshUrl) {
        throw createError({ statusCode: 404, statusMessage: 'No thumbnail found for video' })
      }

      console.log(`[Thumbnail Proxy] Fetching fresh URL for video ${videoId}: ${freshUrl}`)
      response = await fetch(freshUrl)
      if (!response.ok) {
        throw createError({ statusCode: response.status, statusMessage: 'Failed to fetch fresh thumbnail from YouTube CDN' })
      }
    } catch (error: any) {
      console.error(`[Thumbnail Proxy] Error during self-healing for video ${videoId}:`, error)
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || `Error retrieving thumbnail from YouTube API: ${error.message}`
      })
    }
  }

  // 4. Return the image binary data with cache headers
  if (!response) {
    throw createError({ statusCode: 500, statusMessage: 'Response was empty' })
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  setResponseHeaders(event, {
    'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
    'Content-Length': buffer.length.toString(),
    'Cache-Control': 'public, max-age=3600' // Cache in client's browser for 1 hour
  })

  return buffer
})
