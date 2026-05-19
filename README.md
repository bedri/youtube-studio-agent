# YouTube Studio Agent

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

## 👥 Assistant Setup & Privacy Controls

If you want your assistant to manage your YouTube channel without giving them your personal Google account password or login credentials, follow these simple steps:

### 1. Exporting the Access Tokens (Done by the Owner)
1. Log in to the YouTube Studio Agent on your local machine.
2. Visit the secure token exporter route: `http://localhost:50555/api/youtube/export-tokens`
3. Copy the long JSON string inside the `tokenJson` property.
4. Send this JSON string to your assistant securely.

### 2. Configuring the Assistant's Environment (Done by the Assistant)
1. Clone the project to the assistant's computer.
2. In the root directory, create a `.env` file and add the copied token string:
   ```bash
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   YOUTUBE_REDIRECT_URI=http://localhost:50555/api/auth/youtube

   # Paste the exported token JSON here
   YOUTUBE_SHARED_TOKENS='{"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":...}'
   ```
3. Run `npm run dev` to start the app at `http://localhost:50555`. 
4. The assistant will be automatically logged in and can manage all your videos, **completely bypassing the Google Login screen**.

### 🔒 Privacy Safeguards
* **Automatic Private Video Filtering:** When accessed under the assistant session (meaning no owner cookie is present in their local browser), the backend dynamically strips out all `private` status videos.
* **No Private Metadata Access:** The assistant will **never see your private videos** in their video list or dashboard, and any attempt to view private thumbnails or execute bulk updates on private videos is blocked securely with a `403 Forbidden` response.
* **No Google Login Required:** The assistant never interacts with your personal Google credentials.

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

### 1. The Service File (`youtube-studio-agent.service`)

The file is located in the root of the project:
```ini
[Unit]
Description=YouTube Studio Agent Service
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/your/project/youtube-studio-agent
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
sudo cp youtube-studio-agent.service /etc/systemd/system/youtube-studio-agent.service

# 2. Reload the systemd daemon to recognize the new service
sudo systemctl daemon-reload

# 3. Enable the service to launch automatically on system boot
sudo systemctl enable youtube-studio-agent.service

# 4. Start the service
sudo systemctl start youtube-studio-agent.service
```

### 3. Monitoring & Managing

*   **Check status:**
    ```bash
    systemctl status youtube-studio-agent.service
    ```
*   **View real-time application logs:**
    ```bash
    journalctl -u youtube-studio-agent.service -f --no-pager
    ```
*   **Restart service:**
    ```bash
    systemctl restart youtube-studio-agent.service
    ```

---

## 🏃 Running Without Root (No sudo)

If you are running the agent on a shared hosting environment or a server where you **do not have root (sudo) privileges**, you can use `tmux` or `crontab` to keep the application and the Sentinel monitor running in the background.

### Option A: Using `tmux` (Terminal Multiplexer)
`tmux` allows you to spin up a terminal session that persists even after you disconnect from SSH.

1. **Start a new detached session:**
   ```bash
   tmux new -d -s youtube-agent 'NODE_OPTIONS="--dns-result-order=ipv4first" npm run dev'
   ```
2. **Check/View the active logs:**
   Attach to the running session:
   ```bash
   tmux attach -t youtube-agent
   ```
3. **Detach safely:**
   To leave it running in the background, press `Ctrl + B`, then press `D`.

---

### Option B: Auto-start on Reboot via `crontab`
To ensure the agent starts automatically whenever the server restarts without using systemd:

1. Open your user's crontab editor:
   ```bash
   crontab -e
   ```
2. Add the following line at the end of the file (replace `/path/to/your/project` with your actual project path):
   ```text
   @reboot cd /path/to/your/project && NODE_OPTIONS="--dns-result-order=ipv4first" npm run dev > /dev/null 2>&1
   ```
3. Save and close. The app will now boot automatically on system startups under your user account.

---

## 🖥️ Desktop Application (Electron)

The project includes a robust, natively-integrated **Electron.js** desktop wrapper that automatically manages the Nuxt Nitro backend, local KV stores, and YouTube API integrations without relying on a browser.

### 1. Development Mode
To launch the application as a standalone desktop window while preserving Hot Module Replacement (HMR):
```bash
npm run desktop:dev
```

### 2. Building for Production
To package the entire full-stack application into a standalone binary (e.g., `.AppImage` on Linux):
```bash
npm run desktop:build
```

---

## 📦 Universal Graphical Installer

The repository includes a zero-dependency graphical setup wizard specifically designed for Linux distributions (openSUSE, Ubuntu, Fedora, Linux Mint).

The installer utilizes your system's native dialog windows (`zenity` for GNOME/GTK, `kdialog` for KDE Plasma) to guide you through downloading, verifying (via SHA256), and installing the YouTube Studio Agent. If no graphical environment is found, it automatically falls back to a terminal (CLI) interface.

### How to use the installer:
Simply execute the shell script from the project root:
```bash
./installer/install.sh
```

---

## 🔌 Integration & Cloud Sync Guides

*   **[MCP Installation Guide (Gemini/Claude/Cursor)](mcp_installation_guide.md):** Complete step-by-step instructions to connect the YouTube Agent API directly to LLMs (Gemini, Cursor, Claude, VS Code) using the Model Context Protocol (MCP).
*   **[Firebase Sync Plan (Cloud Database Bridge)](firebase_sync_plan.md):** Backup reference blueprint to sync analytics data to a serverless Firebase Realtime DB, allowing assistant views without direct YouTube Channel OAuth access.
