export default defineEventHandler(async (event) => {
  const tokensRaw = getCookie(event, 'youtube_tokens')
  if (!tokensRaw) return { authenticated: false }
  
  try {
    const tokens = JSON.parse(tokensRaw)
    const { oauth2Client, youtube } = useYouTubeClient()
    oauth2Client.setCredentials(tokens)
    
    const channelRes = await youtube.channels.list({
      part: ['snippet'],
      mine: true
    })
    
    return { 
      authenticated: true, 
      channel: channelRes.data.items?.[0]?.snippet 
    }
  } catch (e) {
    return { authenticated: false }
  }
})
