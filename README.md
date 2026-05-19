# YouTube Batch Agent

A highly optimized, premium-designed web application built on **Nuxt 4** and **Tailwind CSS/Nuxt UI** to orchestrate, monitor, and bulk-manage your YouTube channel content autonomously.

---

## 🚀 Key Features

*   **Premium Visual Dashboard:** Immersive dark mode, custom channel banners, real-time subscriber/video counts, and interactive analytics.
*   **Self-Healing Private Thumbnail Proxy:** Solves the expired CDN signature issue for private video thumbnails automatically via a smart backend token-validated proxy route `/api/youtube/thumbnail`.
*   **Shared Management Session:** Persists authentication credentials on the server (`youtube:tokens` KV storage), allowing multiple operators/devices to manage the channel seamlessly without individual logins.
*   **Autonomous Sentinel Monitor:** Background daemon running every 10 minutes to verify video availability, tracking deletions, and sending instant alerts using localized SMTP mail delivery.
*   **Robust Network Routing:** Configured natively to prioritize IPv4 DNS lookups via Node's `--dns-result-order=ipv4first` to prevent TLS timeout issues during OAuth handshake.

---

## 🛠️ Configuration & Credentials

1.  **Google Cloud Project setup:**
    *   Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
    *   Enable the **YouTube Data API v3**.
    *   Configure the OAuth Consent Screen and add scopes: `.../auth/youtube.readonly` and `.../auth/youtube.force-ssl`.
    *   Create **OAuth 2.0 Client ID** credentials. Set Authorized Redirect URIs to: `http://localhost:50555/api/auth/youtube`.

2.  **Environment Setup (`.env`):**
    Create a `.env` file in the root directory:
    ```bash
    # YouTube OAuth2 Credentials
    YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
    YOUTUBE_CLIENT_SECRET=your_client_secret
    YOUTUBE_REDIRECT_URI=http://localhost:50555/api/auth/youtube

    # Local/Remote Mail Configuration for Sentinel Alerts
    SMTP_HOST=localhost
    SMTP_PORT=25
    SMTP_USER=
    SMTP_PASS=
    NOTIFICATION_EMAIL=your_email@domain.com

    # Sentinel Worker Interval (minutes)
    SENTINEL_INTERVAL_MINUTES=10
    ```

---

## 🚀 Running Locally

Install dependencies and start the dev server:
```bash
npm install
npm run dev
```

---

## 🖥️ Systemd Background Service Setup

To keep the application and the autonomous Sentinel worker running 24/7 in the background on your Linux server, deploy it as a systemd service using the bundled service file.

### 1. The Service File (`youtube-agent.service`)

The file is located in the root of the project:
```ini
[Unit]
Description=YouTube Batch Agent Service
After=network.target

[Service]
Type=simple
User=bedri
WorkingDirectory=/home/bedri/Projects/Youtube-Agent
ExecStart=/usr/bin/npm run dev
Restart=on-failure
Environment=NODE_ENV=development

[Install]
WantedBy=multi-user.target
```

### 2. Deploying the Service

Run the following commands to install and start the service:

```bash
# 1. Copy the service file to the systemd directory
sudo cp youtube-agent.service /etc/systemd/system/youtube-agent.service

# 2. Reload the systemd daemon to recognize the new service
sudo systemctl daemon-reload

# 3. Enable the service to launch automatically on system boot
sudo systemctl enable youtube-agent.service

# 4. Start the service
sudo systemctl start youtube-agent.service
```

### 3. Monitoring & Managing

*   **Check status:**
    ```bash
    systemctl status youtube-agent.service
    ```
*   **View real-time application logs:**
    ```bash
    journalctl -u youtube-agent.service -f --no-pager
    ```
*   **Restart service:**
    ```bash
    systemctl restart youtube-agent.service
    ```
