import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '.data', 'storage', 'youtube');

// Load .env variables manually to ensure zero-config start
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}
loadEnv();

// Helper to write to stderr so it doesn't corrupt JSON-RPC stdout channel
function debugLog(msg) {
  fs.writeSync(2, `[MCP Server Debug] ${msg}\n`);
}

// Database helper functions
function readDbFile(subPath) {
  try {
    const fullPath = path.join(DB_PATH, subPath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
  } catch (e) {
    debugLog(`Read error on ${subPath}: ${e.message}`);
  }
  return null;
}

function writeDbFile(subPath, data) {
  try {
    const fullPath = path.join(DB_PATH, subPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    debugLog(`Write error on ${subPath}: ${e.message}`);
    return false;
  }
}

// YouTube Client creator using stored OAuth tokens
function getYouTubeClient() {
  const tokens = readDbFile('tokens');
  if (!tokens || !tokens.access_token) {
    throw new Error('Google OAuth credentials not found in local database. Please sign in via the Web UI first.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID || 'dummy_id',
    process.env.YOUTUBE_CLIENT_SECRET || 'dummy_secret',
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:50555/api/auth/callback'
  );
  
  oauth2Client.setCredentials(tokens);
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

// Main tool router
async function executeTool(name, args) {
  debugLog(`Executing tool: ${name} with arguments: ${JSON.stringify(args)}`);

  if (name === 'get_channel_status') {
    const info = readDbFile('channel_info');
    if (!info) return formatTextResponse('No channel info found in database. Connect to your account first.');
    return formatTextResponse(JSON.stringify(info, null, 2));
  }

  if (name === 'list_videos') {
    const videos = readDbFile('video_cache');
    if (!videos || !Array.isArray(videos)) {
      return formatTextResponse('No videos found in local database cache.');
    }
    const list = videos.map(v => `- [${v.id}] ${v.snippet.title} (${v.status?.privacyStatus || 'public'})\n  Description: ${v.snippet.description.substring(0, 100)}...`).join('\n\n');
    return formatTextResponse(`### YouTube Video Cache List (${videos.length} videos):\n\n${list}`);
  }

  if (name === 'get_analytics') {
    const info = readDbFile('channel_info');
    if (!info) return formatTextResponse('No channel info found to fetch analytics.');
    
    const channelId = info.id;
    const history = readDbFile(`analytics_history/${channelId}.json`);
    
    let summary = `Channel: ${info.snippet?.title || 'Unknown'}\n`;
    summary += `Subscribers: ${info.statistics?.subscriberCount || '0'}\n`;
    summary += `Total Views: ${info.statistics?.viewCount || '0'}\n`;
    
    if (history && Array.isArray(history)) {
      summary += `\n### Recent 15-Day History Logs:\n`;
      history.slice(-15).forEach(day => {
        summary += `- ${day.day}: ${day.subscribers} Subscribers, ${day.views} Views\n`;
      });
    } else {
      summary += `\nNo daily historical logs stored yet. Running in real-time fallback estimates.`;
    }
    return formatTextResponse(summary);
  }

  if (name === 'update_video_description') {
    const { videoId, description } = args;
    if (!videoId || !description) throw new Error('Missing videoId or description arguments.');

    const youtube = getYouTubeClient();
    
    // Get existing video to keep title and categoryId intact
    const videoRes = await youtube.videos.list({
      id: [videoId],
      part: ['snippet']
    });

    if (!videoRes.data.items || videoRes.data.items.length === 0) {
      throw new Error(`Video ID ${videoId} not found on YouTube.`);
    }

    const video = videoRes.data.items[0];
    const snippet = video.snippet;
    snippet.description = description;

    // Execute update
    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: videoId,
        snippet: snippet
      }
    });

    // Update local cache if available
    const videos = readDbFile('video_cache');
    if (videos && Array.isArray(videos)) {
      const idx = videos.findIndex(v => v.id === videoId);
      if (idx !== -1) {
        videos[idx].snippet.description = description;
        writeDbFile('video_cache', videos);
      }
    }

    return formatTextResponse(`Successfully updated description for Video ID: ${videoId} on YouTube.`);
  }

  if (name === 'list_promotions') {
    const info = readDbFile('channel_info');
    if (!info) return formatTextResponse('No channel info found to fetch promotions.');
    
    const promotions = readDbFile(`promotions/${info.id}.json`);
    if (!promotions || promotions.length === 0) {
      return formatTextResponse('No active organic promotions or ad campaigns found.');
    }
    return formatTextResponse(JSON.stringify(promotions, null, 2));
  }

  if (name === 'launch_promotion') {
    const { videoId, dailyBudget, durationDays, targetLocations } = args;
    const info = readDbFile('channel_info');
    if (!info) throw new Error('No channel info found in database. Connect account first.');
    
    const channelId = info.id;
    const promotions = readDbFile(`promotions/${channelId}.json`) || [];

    const newCampaign = {
      id: 'prom_' + Date.now(),
      videoId,
      dailyBudget: Number(dailyBudget),
      durationDays: Number(durationDays),
      targetLocations: targetLocations || 'Global',
      status: 'Active',
      startDate: new Date().toISOString()
    };

    promotions.unshift(newCampaign);
    writeDbFile(`promotions/${channelId}.json`, promotions);

    return formatTextResponse(`Successfully launched new campaign for Video ID: ${videoId}.\nDetails: ${JSON.stringify(newCampaign, null, 2)}`);
  }

  throw new Error(`Unknown tool: ${name}`);
}

function formatTextResponse(text) {
  return {
    content: [
      {
        type: 'text',
        text
      }
    ]
  };
}

// JSON-RPC Stdin/Stdout message parser
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  let lineEnd;
  while ((lineEnd = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) {
      handleRequest(line);
    }
  }
});

async function handleRequest(line) {
  try {
    const request = JSON.parse(line);
    
    // Ignore notifications (which have no id) as per JSON-RPC spec
    if (request.id === undefined) {
      debugLog(`Received notification: ${request.method || 'unknown'}. Ignoring response.`);
      return;
    }

    let result = null;
    let error = null;

    if (request.method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'youtube-studio-agent-mcp',
          version: '1.0.0'
        }
      };
    } else if (request.method === 'tools/list') {
      result = {
        tools: [
          {
            name: 'get_channel_status',
            description: 'Returns basic channel statistics, subscriber count, and details.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'list_videos',
            description: 'Lists all cached YouTube videos with their titles, descriptions, and privacy states.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'get_analytics',
            description: 'Retrieves channel views, daily subscriber gains, and traffic source stats.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'update_video_description',
            description: 'Updates the description of a specific YouTube video on the channel.',
            inputSchema: {
              type: 'object',
              properties: {
                videoId: { type: 'string', description: 'The unique ID of the YouTube video to edit.' },
                description: { type: 'string', description: 'The new description content for the video.' }
              },
              required: ['videoId', 'description']
            }
          },
          {
            name: 'list_promotions',
            description: 'Lists all active ad campaigns and organic promotions.',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'launch_promotion',
            description: 'Launches a new promotional ad campaign for a specific video.',
            inputSchema: {
              type: 'object',
              properties: {
                videoId: { type: 'string', description: 'The ID of the video to promote.' },
                dailyBudget: { type: 'number', description: 'Daily budget in USD.' },
                durationDays: { type: 'number', description: 'Number of days the promotion runs.' },
                targetLocations: { type: 'string', description: 'Target locations (e.g. US, Germany).' }
              },
              required: ['videoId', 'dailyBudget', 'durationDays']
            }
          }
        ]
      };
    } else if (request.method === 'tools/call') {
      try {
        result = await executeTool(request.params.name, request.params.arguments);
      } catch (toolError) {
        error = { code: -32603, message: toolError.message };
      }
    } else {
      error = { code: -32601, message: `Method not found: ${request.method}` };
    }

    sendResponse(request.id, result, error);
  } catch (e) {
    debugLog(`Request parse error: ${e.message}`);
  }
}

function sendResponse(id, result, error) {
  const response = { jsonrpc: '2.0', id };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + '\n');
}

debugLog('YouTube Agent MCP Server started over stdio.');
