export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { videoIds, changes } = body // changes: { titleTemplate, descriptionTemplate, tagsAction: 'add' | 'replace', tags: string[] }

  const tokensRaw = getCookie(event, 'youtube_tokens')
  if (!tokensRaw) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const tokens = JSON.parse(tokensRaw)
  const { oauth2Client, youtube } = useYouTubeClient()
  oauth2Client.setCredentials(tokens)

  const results = []

  for (const id of videoIds) {
    try {
      // 1. Get current metadata
      const videoRes = await youtube.videos.list({
        part: ['snippet'],
        id: [id]
      })

      const video = videoRes.data.items?.[0]
      if (!video || !video.snippet) continue

      const currentVideo = video
      const videoId = id
      const currentTags = currentVideo.snippet.tags || []
      const updatedTags = changes.tagsAction === 'add' 
        ? [...new Set([...currentTags, ...changes.tags])]
        : changes.tags

      // 2. Apply changes
      const updateParams: any = {
      id: videoId,
      snippet: {
        ...currentVideo.snippet,
        title: changes.title ? changes.title.replace('{{title}}', currentVideo.snippet.title) : currentVideo.snippet.title,
        description: changes.description ? changes.description.replace('{{description}}', currentVideo.snippet.description) : currentVideo.snippet.description,
        tags: updatedTags,
        categoryId: changes.categoryId || currentVideo.snippet.categoryId
      },
      status: {
        ...currentVideo.status,
        privacyStatus: changes.privacyStatus || currentVideo.status.privacyStatus,
        selfDeclaredMadeForKids: changes.selfDeclaredMadeForKids !== undefined ? changes.selfDeclaredMadeForKids : currentVideo.status.selfDeclaredMadeForKids
      }
    }

    if (changes.license) {
      updateParams.status.license = changes.license
    }
 if (changes.tagsAction === 'add') {
          updateParams.snippet.tags = [...new Set([...(updateParams.snippet.tags || []), ...changes.tags])]
        } else {
          updateParams.snippet.tags = changes.tags
        }

      // 3. Update
      await youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id,
          snippet
        }
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
