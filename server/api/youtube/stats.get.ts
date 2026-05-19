export default defineEventHandler(async (event) => {
  const storage = useStorage('data')
  const videoCache: any = await storage.getItem('youtube:video_cache')
  
  if (!videoCache) return {}

  // Return a simple mapping of ID -> viewCount
  const statsMap: Record<string, string> = {}
  videoCache.forEach((video: any) => {
    statsMap[video.id] = video.statistics?.viewCount || '0'
  })

  return statsMap
})
