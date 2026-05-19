import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    })
    if (!response.ok) {
      throw new Error(`Ollama status check failed: ${response.statusText}`)
    }
    const data = (await response.json()) as { models?: any[] }
    const models = data.models || []
    const hasGemma = models.some((m: any) => m.name === 'gemma4:e2b' || m.model === 'gemma4:e2b')

    return {
      status: 'online',
      models: models.map((m: any) => ({
        name: m.name || '',
        size: m.size || 0,
        parameter_size: m.details?.parameter_size || 'unknown'
      })),
      hasGemma
    }
  } catch (error: any) {
    return {
      status: 'offline',
      models: [],
      hasGemma: false,
      error: error.message
    }
  }
})
