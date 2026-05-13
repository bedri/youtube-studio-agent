export default defineEventHandler(async (event) => {
  const { oauth2Client } = useYouTubeClient()

  const scopes = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  })

  return sendRedirect(event, url)
})
