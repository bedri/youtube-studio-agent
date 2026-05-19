# Model Context Protocol (MCP) Kurulum ve Entegrasyon Kılavuzu

Bu kılavuz, yerel YouTube Agent projenizin yeteneklerini (video listeleme, açıklama güncelleme, kampanya başlatma, analitik analizi vb.) yapay zeka istemcilerine (Gemini, Claude, Cursor) nasıl bağlayacağınızı adım adım açıklamaktadır.

---

## 🚀 MCP Sunucusu Nedir?

Proje kök dizininde yer alan `mcp-server.js` dosyası, **Model Context Protocol (MCP)** standartlarına göre çalışan stdio tabanlı bir sunucudur. Yapay zeka modeli bu sunucuyu bir alt süreç (child process) olarak başlatır ve JSON-RPC kanalı üzerinden yerel veri tabanınızı okumasını ya da YouTube API'lerini tetiklemesini ister.

### Sunulan Araçlar (Tools):
* `get_channel_status`: Kanalın genel durumunu ve abone sayılarını okur.
* `list_videos`: Yerel önbellekteki tüm videoları listeler.
* `get_analytics`: Kanalın son 15 günlük izlenme ve abone geçmişini çeker.
* `update_video_description`: Bir videonun açıklamasını YouTube üzerinde günceller.
* `list_promotions`: Aktif reklam veya tanıtım kampanyalarını listeler.
* `launch_promotion`: Yeni bir tanıtım kampanyası başlatır.

---

## 🛠️ Entegrasyon Adımları

Yapay zeka modelini nerede kullandığınıza bağlı olarak ilgili konfigürasyonu uygulayın:

### 1. Antigravity (Yapay Zeka Asistanı) Entegrasyonu

Antigravity asistanınızın (şu an konuştuğunuz yapay zeka kodlama asistanı) yerel YouTube Agent API'lerini doğrudan bir araç (tool) olarak kullanabilmesi için:
1. `/home/bedri/.gemini/antigravity/mcp_config.json` dosyasını açın.
2. Aşağıdaki konfigürasyon bloğunu ekleyin:
   ```json
   {
     "mcpServers": {
       "youtube-agent": {
         "command": "node",
         "args": [
           "/home/bedri/Projects/Youtube-Agent/mcp-server.js"
         ]
       }
     }
   }
   ```
3. Bu ayarı yaptıktan sonra, Antigravity'ye "Kanalımdaki videoları listele" veya "Grafiklerimi getir" gibi talimatlar verdiğinizde, asistan dosyaları manuel okumak yerine doğrudan yerel API'leriniz üzerinden gerçek zamanlı sorgular çalıştırabilir.

---

### 2. OpenCode Entegrasyonu

OpenCode kodlama aracınıza yerel YouTube Agent MCP sunucusunu eklemek için:
1. `/home/bedri/.config/opencode/opencode.json` dosyasını açın.
2. Ana objenin içerisine aşağıdaki `mcp` alanını ekleyin:
   ```json
   {
     "mcp": {
       "youtube-agent": {
         "type": "local",
         "command": [
           "node",
           "/home/bedri/Projects/Youtube-Agent/mcp-server.js"
         ],
         "enabled": true
       }
     }
   }
   ```
3. Bu ayarı yaptıktan sonra OpenCode üzerindeki yerel LLM modelleriniz bu API araçlarını kullanmaya yetkili olacaktır.

---

### 3. Cursor IDE Entegrasyonu (Gemini veya Claude ile)

Cursor üzerinde kullandığınız yapay zekanın (Gemini veya Claude) yerel API'lerinizle konuşmasını sağlamak için:
1. Cursor uygulamasında **Settings** (Ayarlar) > **Features** > **MCP** sayfasına gidin.
2. **+ Add New MCP Server** butonuna tıklayın.
3. Form alanlarını şu şekilde doldurun:
   * **Name:** `youtube-agent`
   * **Type:** `stdio`
   * **Command:** `node /home/bedri/Projects/Youtube-Agent/mcp-server.js`
4. Butona basıp sunucuyu ekleyin. Sunucu durumu yeşil (Connected) olduğunda Cursor içindeki chat veya Composer modunda doğrudan "Kanalımdaki videoları listele" yazarak kullanmaya başlayabilirsiniz.

---

### 4. VS Code Entegrasyonu (Cline / Claude Dev Eklentisi)

Eğer VS Code üzerinde Gemini API anahtarınızı kullanarak **Cline** eklentisiyle çalışıyorsanız:
1. `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` dosyasını favori editörünüzde açın.
2. `mcpServers` nesnesinin altına sunucu tanımlamasını ekleyin:
   ```json
   {
     "mcpServers": {
       "youtube-agent": {
         "command": "node",
         "args": [
           "/home/bedri/Projects/Youtube-Agent/mcp-server.js"
         ]
       }
     }
   }
   ```
3. Cline panelini yenilediğinizde veya eklentiyi yeniden başlattığınızda araçlar otomatik olarak yüklenecektir.

---

### 5. VS Code Entegrasyonu (Continue Eklentisi)

**Continue** eklentisi ile yerel MCP sunucusunu bağlamak için:
1. `~/.continue/config.json` dosyasını açın.
2. `contextProviders` dizisinin altına şu tanımı ekleyin:
   ```json
   "contextProviders": [
     {
       "name": "mcp",
       "params": {
         "command": "node",
         "args": ["/home/bedri/Projects/Youtube-Agent/mcp-server.js"]
       }
     }
   ]
   ```

---

### 6. Claude Desktop Entegrasyonu

Eğer Anthropic'in resmi masaüstü uygulamasını kullanıyorsanız:
1. `~/.config/Claude/claude_desktop_config.json` dosyasını açın (yoksa oluşturun).
2. Şu içeriği ekleyin:
   ```json
   {
     "mcpServers": {
       "youtube-agent": {
         "command": "node",
         "args": [
           "/home/bedri/Projects/Youtube-Agent/mcp-server.js"
         ]
       }
     }
   }
   ```
3. Claude Desktop uygulamasını yeniden başlattığınızda sağ altta bir "çekiç" simgesi görünecektir. Bu simge, YouTube Agent araçlarının başarıyla bağlandığını gösterir.

---

### 7. Web AI Studio / Gemini Web Entegrasyonu (OpenAPI / Function Calling)

Bulut tabanlı servislerin (`gemini.google.com` veya `aistudio.google.com`) yerel makinenize erişebilmesi için yerel sunucunuzu dış dünyaya açmanız gerekir:
1. Terminalden `ngrok` veya `localtunnel` kullanarak port `50555`'i tünelleyin:
   ```bash
   ngrok http 50555
   ```
2. Google AI Studio'da projenizi açıp sağ menüdeki **Tools** sekmesinden **Add OpenAPI Tool** butonuna tıklayın.
3. `ngrok` tarafından verilen HTTPS tünel URL'sini ve uygulamanın `/api/youtube` uç noktalarını entegre edin.

---

## 🔒 Güvenlik Notu

MCP sunucusu `.data/storage/youtube/tokens` altındaki oturum bilgilerini kullandığı için **sadece sizin bilgisayarınızda yerel olarak çalıştırılmalıdır.** MCP ayarlarınızdaki dosya yollarının ve proje izinlerinin dışarı sızmadığından emin olun.
