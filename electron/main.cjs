const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

app.name = 'youtube-studio-agent'

let mainWindow
let launcherWindow
let serverProcess
let isServerRunning = false

function createLauncherWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  launcherWindow = new BrowserWindow({
    width: 980,
    height: 660,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    title: "YouTube Studio Agent - Developer Control Center"
  })

  launcherWindow.loadFile(path.join(__dirname, 'launcher.html'))

  launcherWindow.on('closed', () => {
    launcherWindow = null
    // If server is running, kill it on close
    if (serverProcess) {
      serverProcess.kill()
    }
  })

  // Start periodic system metrics updates
  const metricsInterval = setInterval(() => {
    if (!launcherWindow) {
      clearInterval(metricsInterval)
      return
    }
    const memUsage = process.memoryUsage()
    const memory = `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    const cpu = Math.round(Math.random() * 5) // Mock CPU load
    launcherWindow.webContents.send('sys-metrics', { cpu, memory })
  }, 2000)
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus()
    return
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: Math.min(width, 1600),
    height: height,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: "YouTube Studio Agent"
  })

  mainWindow.loadURL('http://localhost:50555')
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.on('get-status', (event) => {
  event.reply('server-status', {
    running: isServerRunning,
    port: '50555'
  })
})

ipcMain.on('start-server', (event) => {
  if (isServerRunning) return

  // Spawn Nuxt dev server process
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  
  serverProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: '50555'
    }
  })

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString().trim()
    if (text) {
      console.log(`Server: ${text}`)
      if (launcherWindow) {
        launcherWindow.webContents.send('server-log', { text, type: '' })
      }
      // Check if server is ready
      if (text.includes('localhost:50555') || text.includes('Vite client built') || text.includes('Nitro server built')) {
        if (!isServerRunning) {
          isServerRunning = true
          if (launcherWindow) {
            launcherWindow.webContents.send('server-status', { running: true, port: '50555' })
            launcherWindow.webContents.send('server-log', { text: '[System] Nuxt Geliştirme Sunucusu Başarıyla Ayakta!', type: 'success' })
          }
        }
      }
    }
  })

  serverProcess.stderr.on('data', (data) => {
    const text = data.toString().trim()
    if (text) {
      console.error(`Server Error: ${text}`)
      if (launcherWindow) {
        launcherWindow.webContents.send('server-log', { text, type: 'err' })
      }
    }
  })

  serverProcess.on('close', (code) => {
    isServerRunning = false
    serverProcess = null
    if (launcherWindow) {
      launcherWindow.webContents.send('server-status', { running: false })
      launcherWindow.webContents.send('server-log', { text: `[System] Server process exited with code ${code}`, type: 'err' })
    }
  })
})

ipcMain.on('stop-server', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})

ipcMain.on('open-app', () => {
  createMainWindow()
})

// Entry Point
function initApp() {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Open Developer Console Launcher Window
    createLauncherWindow()
  } else {
    // Standard Production Mode Flow
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow({
      width: Math.min(width, 1600),
      height: height,
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      autoHideMenuBar: true,
      title: "YouTube Studio Agent"
    })

    const serverPath = path.join(app.getAppPath(), '.output', 'server', 'index.mjs')
    console.log('Starting internal Nuxt server at:', serverPath)
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NITRO_PORT: '50555',
        NODE_ENV: 'production'
      }
    })

    // Poll until server is ready
    const pollServer = setInterval(() => {
      http.get('http://localhost:50555', (res) => {
        if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 404) {
          clearInterval(pollServer)
          mainWindow.loadURL('http://localhost:50555')
        }
      }).on('error', () => {})
    }, 500)

    mainWindow.on('closed', function () {
      mainWindow = null
    })
  }
}

app.on('ready', initApp)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null && launcherWindow === null) {
    initApp()
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})
