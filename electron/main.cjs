const { app, BrowserWindow, screen } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

app.name = 'youtube-studio-agent'

let mainWindow
let serverProcess

function createWindow() {
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

  // Check if we are running in dev mode
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    console.log('Running in development mode, loading localhost:50555')
    mainWindow.loadURL('http://localhost:50555')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, we need to start the Nitro server
    const serverPath = path.join(app.getAppPath(), '.output', 'server', 'index.mjs')
    console.log('Starting internal Nuxt server at:', serverPath)
    
    // Start the child process
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        NITRO_PORT: '50555',
        NODE_ENV: 'production'
      }
    })

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`)
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`)
    })

    // Poll until server is ready
    const pollServer = setInterval(() => {
      http.get('http://localhost:50555', (res) => {
        if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 404) {
          clearInterval(pollServer)
          mainWindow.loadURL('http://localhost:50555')
        }
      }).on('error', () => {
        // Still waiting
      })
    }, 500)
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

// Clean up child process when electron exits
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})
