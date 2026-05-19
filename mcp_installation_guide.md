# Model Context Protocol (MCP) Installation and Integration Guide

This guide describes how to connect the capabilities of your local YouTube Agent project (listing videos, updating descriptions, launching campaigns, analyzing metrics, etc.) directly to LLM clients (Gemini, Claude, Cursor) using the Model Context Protocol (MCP).

---

## 🚀 What is the MCP Server?

The `mcp-server.js` script in the project root directory is a stdio-based server running under the **Model Context Protocol (MCP)** specification. LLM clients spawn this server as a child process and send JSON-RPC commands to read your local database or make direct calls to the YouTube API.

### Available Tools:
* `get_channel_status`: Retrieves basic channel information and subscriber statistics.
* `list_videos`: Lists all videos currently cached in the local database.
* `get_analytics`: Retrieves 15-day view and subscriber analytics history.
* `update_video_description`: Updates the description of a specific video directly on YouTube.
* `list_promotions`: Lists all active ad campaigns and organic promotions.
* `launch_promotion`: Launches a new dynamic organic campaign for a video.

---

## 🛠️ Integration Steps

Follow the corresponding configuration steps based on where you run your AI assistant:

### 1. Antigravity (AI Assistant) Integration

To enable your Antigravity assistant (the AI coding agent you are currently talking to) to call your local YouTube Agent APIs directly as a tool:
1. Open the file `/home/bedri/.gemini/antigravity/mcp_config.json`.
2. Add the following configuration block:
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
3. Once configured, you can directly ask Antigravity to "list my channel videos" or "get my channel stats", and the assistant will execute real-time queries through your local MCP server instead of manually reading files.

---

### 2. OpenCode Integration

To add the local YouTube Agent MCP server to OpenCode:
1. Open the file `/home/bedri/.config/opencode/opencode.json`.
2. Add the `mcp` key to the main configuration object:
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
3. Once updated, your local LLM models in OpenCode will be authorized to access these YouTube Agent tools.

---

### 3. Ollama Terminal (TUI) Integration

If you want to run a local Ollama model (e.g. `gemma4:26b`) and connect it directly to your local MCP server via the command line without using an IDE or GUI:
1. Run the following command in your terminal to spin up an interactive chat session using the `ollmcp` bridge:
   ```bash
   npx -y ollmcp --model gemma4:26b --mcp "node /home/bedri/Projects/Youtube-Agent/mcp-server.js"
   ```
2. This creates an interactive TUI chat interface in your terminal where the Gemma model can directly execute your YouTube Agent tools.

---

### 4. Cursor IDE Integration (with Gemini or Claude)

To enable the AI model running in Cursor to call your local APIs:
1. Open Cursor and go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill out the fields as follows:
   * **Name:** `youtube-agent`
   * **Type:** `stdio`
   * **Command:** `node /home/bedri/Projects/Youtube-Agent/mcp-server.js`
4. Click **Save**. Once the server status indicator turns green (Connected), you can immediately start asking Cursor in the chat or Composer interface to "list my channel videos" or "update description for video X".

---

### 5. VS Code Integration (Cline / Claude Dev Extension)

If you are using the **Cline** extension in VS Code with your Gemini/Claude API Key:
1. Open the global Cline configuration file in your editor:
   `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
2. Add the server definition inside the `mcpServers` object:
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
3. Refresh the Cline panel or restart VS Code to reload the tools list automatically.

---

### 6. VS Code Integration (Continue Extension)

To load the MCP server using **Continue** in VS Code:
1. Open your `~/.continue/config.json` configuration file.
2. Add the provider details under the `contextProviders` array:
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

### 7. Claude Desktop Integration

If you use the official Claude Desktop app by Anthropic:
1. Open your Claude Desktop settings file: `~/.config/Claude/claude_desktop_config.json` (create it if it doesn't exist).
2. Insert the following configuration:
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
3. Restart Claude Desktop. A small hammer icon will appear on the bottom-right corner, indicating the YouTube Agent tools are loaded.

---

### 8. Web AI Studio / Gemini Web Integration (via OpenAPI / Function Calling)

To expose your local API to cloud-based services (`gemini.google.com` or `aistudio.google.com`), you need to tunnel your local port:
1. Run `ngrok` or `localtunnel` to create a public HTTPS gateway for port `50555`:
   ```bash
   ngrok http 50555
   ```
2. Open your project in Google AI Studio, and click **Add OpenAPI Tool** under the **Tools** panel on the right.
3. Provide the public tünnel URL generated by `ngrok` along with the application `/api/youtube` endpoint definitions.

---

## 🔒 Security Notice

Because the MCP server reads local credentials from `.data/storage/youtube/tokens`, **it must only be run locally on your secure machine.** Make sure your configuration file paths and project folder are protected.
