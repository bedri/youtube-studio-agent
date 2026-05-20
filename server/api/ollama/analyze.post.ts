import { defineEventHandler, readBody, setHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const modelName = extractStringValue(body.model) || 'gemma4:e2b'
  const focusPrompt = body.focus || ''

  const storage = useStorage('data')
  
  // 1. Fetch channel statistics
  const channelInfo: any = await storage.getItem('youtube:channel_info')
  const totalSubs = channelInfo?.statistics?.subscriberCount || '5000'
  const totalViews = channelInfo?.statistics?.viewCount || '100000'
  const channelTitle = channelInfo?.snippet?.title || 'YouTube Creator'

  // 2. Fetch video cache
  const videoCache: any = await storage.getItem('youtube:video_cache') || []
  
  // Format top 15 videos
  const formattedVideos = videoCache
    .slice(0, 15)
    .map((v: any) => {
      const durationStr = v.contentDetails?.duration || ''
      const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      let durationSeconds = 0
      if (matches) {
        const hours = parseInt(matches[1] || '0')
        const minutes = parseInt(matches[2] || '0')
        const seconds = parseInt(matches[3] || '0')
        durationSeconds = (hours * 3600) + (minutes * 60) + seconds
      }
      return {
        title: v.snippet?.title || 'Untitled',
        views: parseInt(v.statistics?.viewCount || '0'),
        likes: parseInt(v.statistics?.likeCount || '0'),
        comments: parseInt(v.statistics?.commentCount || '0'),
        duration: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
        isShort: durationSeconds <= 180,
        publishedAt: v.snippet?.publishedAt ? v.snippet.publishedAt.split('T')[0] : 'unknown'
      }
    })

  // 3. Assemble channel performance context
  const dataSummary = `
Kanal Adı: ${channelTitle}
Toplam Abone: ${totalSubs}
Toplam İzlenme: ${totalViews}

Son Yüklenen ve Öne Çıkan 15 Video Detayı:
${formattedVideos.map((v: any, idx: number) => `
${idx + 1}. Başlık: "${v.title}"
   - Yayınlanma Tarihi: ${v.publishedAt}
   - İzlenme: ${v.views}
   - Beğeni: ${v.likes}
   - Yorum: ${v.comments}
   - Süre: ${v.duration} (${v.isShort ? 'Shorts' : 'Uzun Video'})
`).join('\n')}
  `

  const prompt = `
Sen YouTube kanalları için veri analitiği ve strateji planlaması yapan kıdemli bir yapay zeka asistanısın.
Aşağıda yer alan gerçek kanal ve video analitik verilerini kullanarak detaylı bir **Derin Retrospektif ve Trend Analizi** (Deep Retrospective & Trend Analysis) raporu hazırla.

RAPOR DİLİ VE TONU:
- Raporu tamamen TÜRKÇE hazırla.
- Tonu profesyonel, veri odaklı, motive edici ve geliştirici/siberpunk temalı (teknolojik terimler içeren) olsun.

ANALİZ ODAK NOKTASI (Kullanıcı Talebi):
${focusPrompt ? `"${focusPrompt}"` : `"Genel büyüme, abone kazanımı ve içerik sürelerinin (Shorts vs Uzun) performansa etkisi."`}

KANAL VERİLERİ:
${dataSummary}

RAPOR FORMATI:
Raporu Markdown formatında oluştur ve şu başlıkları içermesini sağla:

# 📊 AKILLI TREND & KORELASYON ANALİZİ
*(Kanalın genel durumu hakkında kısa ve çarpıcı bir özet değerlendirme)*

## 1. ⚔️ SWOT Analizi
- **Güçlü Yönler (Strengths):** (Verilere dayanarak, en çok izlenen veya etkileşim alan video/format türleri)
- **Zayıf Yönler (Weaknesses):** (Az izlenen, süresi çok kısa/uzun olup kopma yaşayan veya etkileşimi düşük videolar)
- **Fırsatlar (Opportunities):** (Kanalın büyümesini hızlandırabilecek, henüz keşfedilmemiş alanlar veya trendler)
- **Tehditler (Threats):** (Düşüş trendleri, izleyici kaybına yol açabilecek içerik yorgunluğu vb.)

## 2. ⏱️ Süre ve Format Sweet Spot (Tatlı Nokta) Analizi
- Video sürelerinin izlenme ve beğeni oranlarına etkisini analiz et.
- Shorts videolarının uzun videolara kıyasla etkileşim (beğeni/yorum) verimliliğini değerlendir.
- Kanal için en ideal video süresi (Sweet Spot) aralığını net bir şekilde öner.

## 3. 🎯 Başlık ve Anahtar Kelime Keşifleri
- Başlıklarda yer alan kelimelerin performans korelasyonunu çıkar (Hangi kelimeler/konular daha çok izlenmiş veya beğeni almış?).
- Gelecek videolarda kullanılması gereken yüksek dönüşümlü anahtar kelime önerileri sun.

## 4. 🚀 3 Adımlı Eylem Planı (Action Plan)
- Gelecek videolar için veriye dayalı 3 somut video fikri/konusu ve bunlara dair süre/başlık tavsiyeleri öner.
  `;

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
      statusMessage: `Failed to generate analysis: ${error.message}`
    })
  }
})
