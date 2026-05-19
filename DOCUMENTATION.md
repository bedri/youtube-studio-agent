# 🚀 YouTube Studio Agent - Comprehensive Documentation

[🇬🇧 English Version](#-english-version) | [🇹🇷 Türkçe Versiyon](#-türkçe-versiyon)

---

<a name="-english-version"></a>
## 🇬🇧 English Version

YouTube Studio Agent is a **Fully Autonomous, Privacy-First, and AI-Powered** control panel designed to minimize the time content creators spend managing their channels while maximizing engagement.

This system relies on **Local Artificial Intelligence (Ollama - Gemma/Llama)** instead of cloud-based APIs, ensuring maximum privacy with zero monthly subscription fees.

### 🛠️ Tech Stack
- **Frontend:** Nuxt 4, Vue 3, Tailwind CSS, Nuxt UI (Premium S1 Design Language)
- **Backend:** Nitro Server (Node.js), Unstorage (KV File-based Caching)
- **Artificial Intelligence (AI):** Ollama (Local LLM Integration - e.g., `gemma4:26b`)
- **API Integrations:** Google YouTube Data API v3 (OAuth 2.0 & API Key)

### 🌟 Core Features

#### 1. Sentinel (Autonomous Background Monitor)
The system includes a 24/7 active "Sentinel" background worker.
* **What it does:** Scans your YouTube channel at set intervals (e.g., every 10 minutes).
* **KV Store Integration:** Saves fetched data (video statistics, views, likes) to a local KV (Key-Value) store in the `.data/storage` folder.
* **Alert System:** Automatically sends an email notification via a local SMTP server if it detects an anomaly (e.g., a deleted or private video).

#### 2. Smart Trend & Correlation Analysis (Retrospective)
An AI module that analyzes your channel's past performance.
* **What it does:** Sends statistics gathered by the Sentinel to the local Ollama LLM.
* **Output:** Reports on why certain videos get more views, which title types bring a higher CTR (Click-Through Rate), and dictates content strategy for your next video.

#### 3. AI Copywriter (Autonomous Copywriter)
Generates SEO-optimized titles and descriptions in seconds.
* **What it does:** Takes a draft title or the core idea of an uploaded video.
* **Output:** Provides 3 title alternatives tailored to your channel's tone to boost CTR, and generates engaging, YouTube algorithm-friendly descriptions enriched with emojis.
* **Action:** Saves your favorite text directly to YouTube with a single click.

#### 4. Smart Comment Moderation & Auto-Replies
Reads and categorizes hundreds of incoming comments on your behalf.
* **Spam & Troll Filter:** Detects and hides comments containing insults, ads, or bots.
* **Categorization:** Separates comments into "Question" and "Constructive Criticism/Feedback".
* **Autonomous Reply Drafts:** Prepares automated draft responses to high-quality comments in your channel's unique tone. You just hit "Send."

#### 5. Global Localization and Auto-Translation (A/B Testing)
Delivers your content to audiences worldwide.
* **What it does:** Takes the original title and description of your video and translates them into target languages (e.g., English, German, Spanish) without breaking the context or YouTube SEO structure.
* **A/B Comparison:** Allows you to view the original text alongside the translation side-by-side for manual editing.
* **Localizations API:** Once you click "Apply to YouTube," it pushes the translations directly to YouTube's "Subtitles & localizations" database.

#### 6. Promotions & Campaign Management (Ads Simulation)
A dashboard to track your ad and promotion campaigns.
* **Current Status:** Currently operates as a simulation (Mock Data).
* **Features:** You can launch simulated promotions and instantly toggle their status (ACTIVE / PAUSED) from the UI.
* **Future Plan:** Once Google Ads API (Basic Access) is approved, this panel will be updated to manage your real Google Ads budget and spending directly.

### ⚙️ Setup & Installation
1. Node.js (v18 or higher)
2. Ollama running locally on port `11434`.
3. Fill out the `.env` file with your `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`.
4. Run `npm install` followed by `npm run dev`.

---

<a name="-türkçe-versiyon"></a>
## 🇹🇷 Türkçe Versiyon

YouTube Studio Agent, içerik üreticilerinin (YouTuber) kanallarını yönetirken harcadıkları zamanı minimuma indirmek ve etkileşimi maksimize etmek için tasarlanmış **Tam Otonom, Gizlilik Odaklı ve Yapay Zeka Destekli** bir kontrol panelidir. 

Bu sistem, bulut tabanlı API'ler yerine **Yerel Yapay Zeka (Ollama - Gemma/Llama)** kullanarak hiçbir aylık abonelik ücreti gerektirmeden maksimum gizlilik sağlar.

### 🛠️ Teknoloji Yığını
- **Frontend:** Nuxt 4, Vue 3, Tailwind CSS, Nuxt UI (Premium S1 Tasarım Dili)
- **Backend:** Nitro Server (Node.js), Unstorage (KV File-based Caching)
- **Yapay Zeka (AI):** Ollama (Yerel LLM Entegrasyonu - Örn: `gemma4:26b`)
- **API Entegrasyonları:** Google YouTube Data API v3 (OAuth 2.0 & API Key)

### 🌟 Temel Özellikler

#### 1. Sentinel (Otonom Arka Plan İzleyicisi)
Sistem 7/24 aktif çalışan bir "Sentinel" (Nöbetçi) arka plan görevi (worker) içerir.
* **Ne Yapar?** Belirli aralıklarla (örn: 10 dakikada bir) YouTube kanalınızı tarar. 
* **KV Store Entegrasyonu:** Çektiği verileri (video istatistikleri, izlenmeler, beğeniler) `.data/storage` klasöründeki yerel KV (Key-Value) sistemine kaydeder.
* **Uyarı Sistemi:** Kanalınızda anormal bir durum sezerse (örn: silinen veya gizliye alınan bir video) yerel SMTP sunucusu üzerinden otomatik olarak bilgilendirme e-postası gönderir.

#### 2. Akıllı Trend & Korelasyon Analizi (Retrospective)
Kanalınızın geçmiş performansını analiz eden yapay zeka modülüdür.
* **Ne Yapar?** Sentinel'in topladığı istatistikleri Ollama'ya gönderir.
* **Çıktı:** Hangi videoların neden daha çok izlendiğini, hangi başlık tiplerinin daha fazla tıklama (CTR) getirdiğini raporlar ve bir sonraki videonuz için içerik stratejisi belirler.

#### 3. AI Metin Yazarı (Autonomous Copywriter)
SEO uyumlu başlık ve açıklamaları sizin yerinize saniyeler içinde yazar.
* **Ne Yapar?** Yüklediğiniz bir videonun mevcut taslak başlığını veya ana fikrini alır.
* **Çıktı:** Kanalınızın tarzına (tonuna) uygun, tıklanma oranını artıracak 3 farklı başlık alternatifi ve emojilerle zenginleştirilmiş YouTube algoritmasına uygun açıklama (Description) metinleri sunar.
* **Uygulama:** Beğendiğiniz metni tek tıkla doğrudan YouTube'a kaydeder.

#### 4. Akıllı Yorum Moderasyonu & Taslak Yanıtlar
Kanalınıza gelen yüzlerce yorumu sizin yerinize okur ve sınıflandırır.
* **Spam & Troll Filtresi:** Hakaret, reklam veya bot içeren yorumları tespit edip gizler.
* **Kategorizasyon:** Yorumları "Soru" (Question) veya "Yapıcı Eleştiri/Geri Bildirim" (Feedback) olarak ayırır.
* **Otonom Yanıt Draftı:** Kaliteli yorumlara kanalınızın dilinden (örn: samimi, profesyonel) otomatik taslak yanıtlar hazırlar. Siz sadece "Gönder" butonuna basarsınız.

#### 5. Global Yerelleştirme ve Otomatik Çeviri (A/B Testi)
İçeriklerinizi dünya çapındaki izleyicilere ulaştırır.
* **Ne Yapar?** Videonuzun orijinal başlık ve açıklamasını alır; İngilizce, Almanca, İspanyolca gibi hedeflenen dillere, bağlamı ve YouTube SEO yapısını bozmadan çevirir.
* **A/B Kıyaslama:** Arayüz üzerinde orijinal metin ile çeviriyi yan yana görerek manuel düzenleme yapmanıza olanak tanır.
* **Localizations API:** "YouTube'a Uygula" butonuna bastığınızda, metinleri kopyala-yapıştır yapmadan doğrudan YouTube veritabanındaki "Çeviriler" altyapısına işler.

#### 6. Promotions & Kampanya Yönetimi (Ads Simulation)
Reklam ve promosyon kampanyalarınızı takip ettiğiniz paneldir.
* **Mevcut Durum:** Şu anda bir simülasyon (Mock Data) olarak çalışır. 
* **Özellikler:** Videoları "Launch Promotion" ile promosyona çıkarabilir, durumlarını (ACTIVE / PAUSED) arayüzden anlık olarak değiştirebilirsiniz.
* **Gelecek Planı:** Google Ads API (Basic Access) onaylandığında, doğrudan gerçek Google Ads bütçe ve harcamalarınızı bu panelden yönetecek şekilde güncellenecektir.

### ⚙️ Kurulum ve Çalıştırma
1. Node.js (v18 veya üzeri)
2. Ollama bilgisayarınızda kurulu ve 11434 portunda aktif olmalıdır.
3. `.env` dosyasına `YOUTUBE_CLIENT_ID` ve `YOUTUBE_CLIENT_SECRET` bilgilerinizi girin.
4. Sırasıyla `npm install` ve `npm run dev` komutlarını çalıştırın.
