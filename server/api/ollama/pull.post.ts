import { defineEventHandler, readBody, setHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const modelName = body.name || 'gemma4:e2b'

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    })

    if (!ollamaResponse.ok) {
      throw createError({
        statusCode: ollamaResponse.status,
        statusMessage: `Ollama error: ${ollamaResponse.statusText}`
      })
    }

    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    // Return the response body stream directly so Nitro can pipe it to the client
    return ollamaResponse.body
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to initiate pull: ${error.message}`
    })
  }
})
