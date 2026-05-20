import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const comments = body.comments
  const videoTitle = body.videoTitle
  const modelName = extractStringValue(body.model) || 'gemma4:e2b'
  const lang = getSystemLanguage(event)
  const isTr = lang === 'Turkish'

  if (!comments || !Array.isArray(comments)) {
    throw createError({ statusCode: 400, statusMessage: 'comments array is required' })
  }

  if (comments.length === 0) {
    return []
  }

  const prompt = `
You are an expert YouTube community moderator. Classify the following list of comments for the video titled "${videoTitle || 'Untitled Video'}" and draft appropriate reply templates.

Classification rules:
1. "spam_troll": spam, advertisements, self-promotional links, hate speech, offensive text, or troll noise.
2. "question": user asking a genuine question about the video, code, details, or channel.
3. "feedback": general appreciation, positive reviews, constructive critique, or encouragement.

You MUST format the output ONLY as a JSON array of objects inside a \`\`\`json ... \`\`\` block, with keys:
- "commentId" (string, must exactly match the input commentId)
- "classification" (string: "spam_troll" | "question" | "feedback")
- "rationale" (string, short 1-sentence ${lang} reason explaining the classification)
- "draftReply" (string or null, a friendly, professional ${lang} reply draft. If the classification is spam_troll, set to null)

Input Comments:
${JSON.stringify(comments.map(c => ({ commentId: c.commentId, author: c.author, text: c.text })), null, 2)}

Respond ONLY with the JSON array. Do not write any conversational intro or outro.
  `

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2
        }
      })
    })

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama status code: ${ollamaResponse.status}`)
    }

    const data = (await ollamaResponse.json()) as { response?: string }
    const rawText = data.response || ''
    
    // Extract JSON block
    let jsonString = rawText
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1]
    } else {
      const arrayMatch = rawText.match(/\[\s*\{[\s\S]*?\}\s*\]/)
      if (arrayMatch) {
        jsonString = arrayMatch[0]
      }
    }

    try {
      const parsed = JSON.parse(jsonString)
      return parsed
    } catch (parseErr) {
      console.warn('[Comment Moderate API] JSON parsing failed, raw text:', rawText)
      // Fallback: Return raw list with default classifications
      return comments.map(c => ({
        commentId: c.commentId,
        classification: 'feedback',
        rationale: isTr ? 'Otomatik geri bildirim sınıflandırması (Format hatası düzeltildi).' : 'Automatic classification (format error fallback).',
        draftReply: isTr ? `Destekleriniz için çok teşekkür ederiz, harika bir gün dileriz!` : `Thank you so much for your support! Have a great day!`
      }))
    }
  } catch (error: any) {
    console.error('[Comment Moderate API] Ollama request failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to moderate comments: ${error.message}`
    })
  }
})
