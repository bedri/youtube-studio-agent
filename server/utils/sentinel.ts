import { useYouTubeClient } from './youtube'

export const runSentinelCheck = async () => {
  console.log('[Sentinel] Starting YouTube video check...')
  
  const storage = useStorage('data')
  const tokens: any = await storage.getItem('youtube:tokens')
  
  if (!tokens) {
    console.warn('[Sentinel] No YouTube tokens found. Skipping check.')
    return
  }

  try {
    const { oauth2Client, youtube } = useYouTubeClient()
    oauth2Client.setCredentials(tokens)

    // 1. Get current channel info and stats
    const channelRes = await youtube.channels.list({
      part: ['contentDetails', 'statistics', 'snippet', 'brandingSettings'],
      mine: true
    })

    const channel = channelRes.data.items?.[0]
    if (channel) {
      // Store latest stats and branding for the agent's memory
      await storage.setItem('youtube:channel_info', {
        snippet: channel.snippet,
        statistics: channel.statistics,
        branding: channel.brandingSettings,
        updatedAt: new Date().toISOString()
      })
    }

    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads
    if (!uploadsPlaylistId) return

    let currentVideoIds: string[] = []
    let nextPageToken: string | undefined = undefined
    
    // Fetch first 50 videos (can be expanded)
    const playlistItemsRes: any = await youtube.playlistItems.list({
      part: ['contentDetails', 'snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken
    })
    
    const items = playlistItemsRes.data.items || []
    currentVideoIds = items.map((item: any) => item.contentDetails?.videoId).filter(Boolean)

    // 1.5 Fetch full details for these videos (to get statistics/views)
    let fullVideos: any[] = []
    if (currentVideoIds.length > 0) {
      const videosRes = await youtube.videos.list({
        part: ['snippet', 'status', 'statistics', 'contentDetails'],
        id: currentVideoIds
      })
      fullVideos = videosRes.data.items || []
    }

    // 2. Get previous known videos
    const knownVideos: any = await storage.getItem('youtube:known_videos') || []
    
    if (knownVideos.length > 0) {
      // 3. Compare: Find videos that were in known but are NOT in current
      const deletedVideos = knownVideos.filter((id: string) => !currentVideoIds.includes(id))
      
      if (deletedVideos.length > 0) {
        console.log(`[Sentinel] Detected ${deletedVideos.length} deleted videos!`)
        
        // Try to find titles for deleted videos (optional, requires history)
        const alertMessage = `The following video IDs were detected as deleted or missing from your channel: \n\n${deletedVideos.join('\n')}\n\nCheck your YouTube studio for details.`
        
        await sendNotification('⚠️ YouTube Alert: Video(s) Deleted', alertMessage)
      } else {
        console.log('[Sentinel] No deletions detected.')
      }
    }

    // 4. Update known list and full video data cache
    await storage.setItem('youtube:known_videos', currentVideoIds)
    await storage.setItem('youtube:video_cache', fullVideos)
    console.log('[Sentinel] Check complete. Known videos and stats updated.')

  } catch (error: any) {
    console.error('[Sentinel] Error during check:', error.message)
  }
}
