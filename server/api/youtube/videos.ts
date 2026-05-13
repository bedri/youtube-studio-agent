export default defineEventHandler(async (event) => {
  const tokensRaw = getCookie(event, 'youtube_tokens')
  if (!tokensRaw) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const tokens = JSON.parse(tokensRaw)
  const { oauth2Client, youtube } = useYouTubeClient()
  oauth2Client.setCredentials(tokens)

  // 1. Get channel info to find the uploads playlist ID
  const channelRes = await youtube.channels.list({
    part: ['contentDetails', 'snippet'],
    mine: true
  })

  const channel = channelRes.data.items?.[0]
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads

  console.log('Channel ID:', channel?.id)
  console.log('Uploads Playlist ID:', uploadsPlaylistId)

  if (!uploadsPlaylistId) {
    throw createError({ statusCode: 404, statusMessage: 'Uploads playlist not found' })
  }

  // 2. Fetch videos from the uploads playlist (paginated)
  let allPlaylistItems: any[] = []
  let nextPageToken: string | undefined = undefined
  
  // Fetch up to 500 videos (10 pages of 50)
  for (let i = 0; i < 10; i++) {
    const playlistItemsRes: any = await youtube.playlistItems.list({
      part: ['contentDetails', 'snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken
    })
    
    allPlaylistItems = [...allPlaylistItems, ...(playlistItemsRes.data.items || [])]
    nextPageToken = playlistItemsRes.data.nextPageToken
    
    if (!nextPageToken) break
  }

  console.log('Total playlist items found:', allPlaylistItems.length)
  
  const videoIds = allPlaylistItems.map(item => item.contentDetails?.videoId).filter(Boolean) as string[]
  if (videoIds.length === 0) return []

  // YouTube videos.list allows max 50 IDs per request
  let allVideos: any[] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)
    const videosRes = await youtube.videos.list({
      part: ['snippet', 'status', 'statistics', 'contentDetails'],
      id: chunk
    })
    allVideos = [...allVideos, ...(videosRes.data.items || [])]
  }

  console.log('Total videos fetched from API:', allVideos.length)
  return allVideos
})
