import { defineEventHandler, readBody, setHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const videoId = extractStringValue(body.videoId)
  const type = body.type
  const context = body.context
  const modelName = extractStringValue(body.model) || 'gemma4:e2b'

  if (!videoId) {
    throw createError({ statusCode: 400, statusMessage: 'videoId is required' })
  }

  const storage = useStorage('data')
  const videoCache = ((await storage.getItem('youtube:video_cache')) as any[]) || []
  const video = videoCache.find((v: any) => v.id === videoId)

  if (!video) {
    throw createError({ statusCode: 404, statusMessage: 'Video not found in cache' })
  }

  const title = video.snippet?.title || 'Untitled Video'
  const currentDescription = video.snippet?.description || ''
  const tags = video.snippet?.tags?.join(', ') || 'None'

  let prompt = ''

  if (type === 'description') {
    prompt = `
You are an expert YouTube SEO optimizer and copywriter. Your goal is to write a search-optimized, engaging, and structured YouTube video description in Turkish based on the following video details:

Video Başlığı: ${title}
Mevcut Açıklama: ${currentDescription}
Etiketler: ${tags}
Kullanıcı Notları / Ek Bağlam: ${context || 'None'}

Please output a structured, complete YouTube description in Turkish. Format it beautifully using standard text spacing (do not use markdown headings like # or ## in the final description text, as YouTube descriptions do not render them). The output must contain:
1. Birinci Bölüm: Arama sonuçlarında (ilk 3 satır) öne çıkacak dikkat çekici bir giriş ve video özeti.
2. İkinci Bölüm: Zaman damgaları taslağı (örneğin: 00:00 - Giriş, 01:30 - Detaylar).
3. Üçüncü Bölüm: İzleyiciyi abone olmaya, beğenmeye yönlendiren ve sosyal medya/ürün linkleri için yer tutucuları olan bir Çağrı (Call to Action).
4. Dördüncü Bölüm: İlgili anahtar kelimeler ve hashtag'ler (#...).

ÖNEMLİ: Cevabında asla giriş, selamlama veya açıklama cümleleri yazma. Doğrudan video açıklama metnini yazmaya başla.
    `
  } else {
    prompt = `
You are a high-conversion marketing copywriter. Your goal is to write multiple promotional ad copies and social media announcements in Turkish to promote the following YouTube video:

Video Başlığı: ${title}
Video Açıklaması: ${currentDescription}
Etiketler: ${tags}
Kullanıcı Notları / Ek Bağlam: ${context || 'None'}

Please output the promotional copies in Turkish structured in Markdown under these headings:
# 📢 KAMPANYA REKLAM METİNLERİ

## 1. 📺 YouTube Reklam Başlığı & Overlay Metinleri
(Kısa, dikkat çekici, yüksek tıklama oranına sahip başlık alternatifleri)

## 2. 🐦 Twitter / X Kampanya Gönderileri
(Karakter sınırına uygun, emojili, merak uyandırıcı ve video linki yer tutucusu barındıran 2 adet gönderi seçeneği)

## 3. 📧 E-Posta Bülteni Sponsor Yazısı
(Bülten okuyucularını videoyu izlemeye ikna edecek hikaye odaklı, samimi bir sponsorluk metni)

ÖNEMLİ: Cevabında asla giriş, selamlama veya açıklama cümleleri yazma. Doğrudan Markdown formatındaki metin şablonunu yazmaya başla.
    `
  }

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: true
      })
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

    return ollamaResponse.body
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to generate copywrite: ${error.message}`
    })
  }
})
