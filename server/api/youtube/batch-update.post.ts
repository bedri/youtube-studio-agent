export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { videoIds, changes } = body // changes: { titleTemplate, descriptionTemplate, tagsAction: 'add' | 'replace', tags: string[] }

  const tokens = await getYouTubeTokens(event)
  if (!tokens) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { youtube, isApiKey } = useYouTubeClient(event, tokens)
  if (isApiKey) {
    throw createError({ statusCode: 403, statusMessage: 'Write operations are forbidden with API Key authentication.' })
  }

  const isOwner = !!getCookie(event, 'youtube_tokens')
  const results = []

  for (const id of videoIds) {
    try {
      // 1. Get current metadata
      const videoRes = await youtube.videos.list({
        part: ['snippet', 'status'],
        id: [id]
      })

      const video = videoRes.data.items?.[0]
      if (!video || !video.snippet) continue

      if (video.status?.privacyStatus === 'private' && !isOwner) {
        results.push({ id, status: 'error', message: 'Forbidden: Access denied to private video for assistant' })
        continue
      }

      const currentVideo = video
      const videoId = id
      const currentTags = currentVideo.snippet?.tags || []
      const updatedTags = changes.tagsAction === 'add' 
        ? [...new Set([...currentTags, ...(changes.tags || [])])]
        : changes.tags

      // 2. Apply changes
      const updateParams: any = {
        id: videoId,
        snippet: {
          ...currentVideo.snippet,
          title: changes.title && currentVideo.snippet?.title ? changes.title.replace('{{title}}', currentVideo.snippet.title) : currentVideo.snippet?.title,
          description: changes.description && currentVideo.snippet?.description ? changes.description.replace('{{description}}', currentVideo.snippet.description) : currentVideo.snippet?.description,
          tags: updatedTags,
          categoryId: changes.categoryId || currentVideo.snippet?.categoryId
        },
        status: {
          ...currentVideo.status,
          privacyStatus: changes.privacyStatus || currentVideo.status?.privacyStatus,
          selfDeclaredMadeForKids: changes.selfDeclaredMadeForKids !== undefined ? changes.selfDeclaredMadeForKids : currentVideo.status?.selfDeclaredMadeForKids
        }
      }

      if (changes.license) {
        updateParams.status.license = changes.license
      }

      // 3. Update
      await youtube.videos.update({
        part: ['snippet', 'status'],
        requestBody: updateParams
      })

      results.push({ id, status: 'success' })
    } catch (error: any) {
      results.push({ id, status: 'error', message: error.message })
    }
    
    // Quota/Rate limiting: Add a small delay if needed, 
    // but sequential execution is usually fine for small batches.
  }

  return results
})
