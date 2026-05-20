import { defineEventHandler, readBody, setHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const videoId = extractStringValue(body.videoId)
  const type = body.type
  const context = body.context
  const modelName = extractStringValue(body.model) || 'gemma4:e2b'
  const lang = getSystemLanguage(event)
  const isTr = lang === 'Turkish'

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
    prompt = isTr ? `
Sen uzman bir YouTube SEO optimizasyoncusu ve metin yazarısın. Amacın, aşağıdaki video detaylarına dayanarak Türkçe dilinde arama motoru uyumlu, ilgi çekici ve yapılandırılmış bir YouTube video açıklaması yazmaktır:

Video Başlığı: ${title}
Mevcut Açıklama: ${currentDescription}
Etiketler: ${tags}
Kullanıcı Notları / Ek Bağlam: ${context || 'Yok'}

Lütfen Türkçe dilinde yapılandırılmış, eksiksiz bir YouTube açıklaması oluştur. Standart metin boşluklarını kullanarak güzel bir şekilde biçimlendir (nihai açıklama metninde # veya ## gibi markdown başlıkları kullanma, çünkü YouTube açıklamaları bunları desteklemez). Çıktı şunları içermelidir:
1. Birinci Bölüm: Arama sonuçlarında (ilk 3 satır) öne çıkacak dikkat çekici bir giriş ve video özeti.
2. İkinci Bölüm: Zaman damgaları taslağı (örneğin: 00:00 - Giriş, 01:30 - Detaylar).
3. Üçüncü Bölüm: İzleyiciyi abone olmaya, beğenmeye yönlendiren ve sosyal medya/ürün linkleri için yer tutucuları olan bir Çağrı (Call to Action).
4. Dördüncü Bölüm: İlgili anahtar kelimeler ve hashtag'ler (#...).

ÖNEMLİ: Cevabında asla giriş, selamlama veya açıklama cümleleri yazma. Doğrudan video açıklama metnini yazmaya başla.
    ` : `
You are an expert YouTube SEO optimizer and copywriter. Your goal is to write a search-optimized, engaging, and structured YouTube video description in ${lang} based on the following video details:

Video Title: ${title}
Current Description: ${currentDescription}
Tags: ${tags}
User Notes / Extra Context: ${context || 'None'}

Please output a structured, complete YouTube description in ${lang}. Format it beautifully using standard text spacing (do not use markdown headings like # or ## in the final description text, as YouTube descriptions do not render them). The output must contain:
1. Part 1: An attention-grabbing hook and video summary that stands out in search results (first 3 lines).
2. Part 2: Timestamps draft (e.g., 00:00 - Introduction, 01:30 - Details).
3. Part 3: A Call to Action encouraging viewers to subscribe, like, and placeholders for social media/product links.
4. Part 4: Relevant keywords and hashtags (#...).

IMPORTANT: Do not include any introduction, greeting, or explanatory sentences in your response. Start writing the video description text directly.
    `
  } else {
    prompt = isTr ? `
Sen yüksek dönüşümlü pazarlama metin yazarıyısın. Amacın, aşağıdaki YouTube videosunu tanıtmak için Türkçe dilinde birden fazla promosyonel reklam metni ve sosyal medya duyurusu yazmaktır:

Video Başlığı: ${title}
Video Açıklaması: ${currentDescription}
Etiketler: ${tags}
Kullanıcı Notları / Ek Bağlam: ${context || 'Yok'}

Lütfen promosyonel metinleri Türkçe dilinde ve şu başlıklar altında Markdown formatında oluştur:
# 📢 KAMPANYA REKLAM METİNLERİ

## 1. 📺 YouTube Reklam Başlığı & Overlay Metinleri
(Kısa, dikkat çekici, yüksek tıklama oranına sahip başlık alternatifleri)

## 2. 🐦 Twitter / X Kampanya Gönderileri
(Karakter sınırına uygun, emojili, merak uyandırıcı ve video linki yer tutucusu barındıran 2 adet gönderi seçeneği)

## 3. 📧 E-Posta Bülteni Sponsor Yazısı
(Bülten okuyucularını videoyu izlemeye ikna edecek hikaye odaklı, samimi bir sponsorluk metni)

ÖNEMLİ: Cevabında asla giriş, selamlama veya açıklama cümleleri yazma. Doğrudan Markdown formatındaki metin şablonunu yazmaya başla.
    ` : `
You are a high-conversion marketing copywriter. Your goal is to write multiple promotional ad copies and social media announcements in ${lang} to promote the following YouTube video:

Video Title: ${title}
Video Description: ${currentDescription}
Tags: ${tags}
User Notes / Extra Context: ${context || 'None'}

Please output the promotional copies in ${lang} structured in Markdown under these headings:
# 📢 CAMPAIGN AD COPIES

## 1. 📺 YouTube Ad Headings & Overlay Texts
(Short, attention-grabbing, high-CTR heading alternatives)

## 2. 🐦 Twitter / X Campaign Posts
(Character limit friendly, with emojis, engaging, and including a video link placeholder, 2 options)

## 3. 📧 Email Newsletter Sponsor Blurb
(A story-driven, warm sponsorship blurb to convince newsletter readers to watch the video)

IMPORTANT: Do not include any introduction, greeting, or explanatory sentences in your response. Start writing the Markdown template directly.
    `
  }

  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        system: isTr 
          ? "Sen profesyonel bir YouTube SEO uzmanı ve metin yazarısın. Çıktıyı tamamen Türkçe üret."
          : `You are a professional YouTube SEO specialist and copywriter. You MUST write the output entirely in ${lang} language.`,
        prompt: prompt,
        stream: true,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          top_k: 40
        }
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
