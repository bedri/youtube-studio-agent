import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const title = body.title
  const description = body.description
  const targetLang = extractStringValue(body.targetLang)
  const modelName = extractStringValue(body.model) || 'gemma4:latest'

  if (!title || !targetLang) {
    throw createError({ statusCode: 400, statusMessage: 'Title and target language are required' })
  }

  // Ensure Ollama server is running and accessible
  const isOnline = await checkOllamaOnline()
  if (!isOnline) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Local Ollama server is offline. Please start it on port 11434.'
    })
  }

  // Construct the prompt for Ollama
  // The goal is to get a clean JSON response back containing translatedTitle and translatedDescription
  const systemPrompt = `You are an expert YouTube SEO specialist and professional translator. 
Your task is to translate a YouTube video title and description into ${targetLang}.
Maintain the creator's engaging tone, keep emojis if present, and ensure the title is click-worthy and culturally appropriate for the target language.
Do NOT translate URLs or hashtags, keep them exactly as they are.

You MUST respond strictly in valid JSON format with the following schema:
{
  "translatedTitle": "The translated video title",
  "translatedDescription": "The translated video description"
}
Do not include any other markdown formatting or explanatory text outside of the JSON object.`

  const userPrompt = `Please translate the following into ${targetLang}:

--- TITLE ---
${title}

--- DESCRIPTION ---
${description || ''}`

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.response)

    return {
      success: true,
      translatedTitle: result.translatedTitle,
      translatedDescription: result.translatedDescription
    }

  } catch (error: any) {
    console.error('Ollama Translation Error:', error)
    
    // Fallback if JSON parsing fails or Ollama model errors out
    throw createError({
      statusCode: 500,
      statusMessage: `Translation failed: ${error.message}`
    })
  }
})

// Helper to check Ollama status
async function checkOllamaOnline() {
  try {
    const res = await fetch('http://127.0.0.1:11434/')
    return res.ok || res.status === 200
  } catch (e) {
    return false
  }
}
