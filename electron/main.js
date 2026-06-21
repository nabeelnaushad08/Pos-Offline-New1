const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const http = require('http');

// Paths
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'pos-data');
const dbPath = path.join(dbDir, 'pos.db');
const envPath = path.join(userDataPath, 'pos-data', '.env');
const machineIdPath = path.join(userDataPath, 'pos-data', 'machine.id');

let mainWindow = null;
let nextServer = null;
const PORT = 3000;

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Get or generate a stable machine ID
function getMachineId() {
  ensureDataDir();
  if (fs.existsSync(machineIdPath)) {
    return fs.readFileSync(machineIdPath, 'utf8').trim();
  }
  // Generate from hardware info + random UUID
  const hwInfo = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  const baseId = crypto.createHash('sha256').update(hwInfo).digest('hex').slice(0, 16).toUpperCase();
  const machineId = `${baseId.slice(0,4)}-${baseId.slice(4,8)}-${baseId.slice(8,12)}-${baseId.slice(12,16)}`;
  fs.writeFileSync(machineIdPath, machineId, 'utf8');
  return machineId;
}

// Write environment file for Next.js
function writeEnvFile() {
  ensureDataDir();
  const machineId = getMachineId();
  const secret = crypto.randomBytes(32).toString('hex');

  // Check if env already has a secret
  let existingSecret = '';
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    const match = existing.match(/NEXTAUTH_SECRET=(.+)/);
    if (match) existingSecret = match[1];
  }

  const envContent = [
    `DATABASE_URL=file:${dbPath.replace(/\\/g, '/')}`,
    `NEXTAUTH_URL=http://localhost:${PORT}`,
    `NEXTAUTH_SECRET=${existingSecret || secret}`,
    `MACHINE_ID=${machineId}`,
    `ELECTRON_MODE=true`,
    `NODE_ENV=production`,
  ].join('\n');

  fs.writeFileSync(envPath, envContent, 'utf8');
}

// Load env file into process.env
function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

// Wait for Next.js server to be ready
function waitForServer(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Server did not start in time'));
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  });
}

// Start Next.js server
function startNextServer() {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const env = { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1' };

    let cmd, args, cwd;

    if (app.isPackaged) {
      // In packaged app: run the standalone server.js directly with node
      const standaloneDir = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      const serverJs = path.join(standaloneDir, 'server.js');
      cmd = process.execPath; // node binary bundled with electron
      args = [serverJs];
      cwd = standaloneDir;
    } else {
      // In dev: use npm run start from project root
      cmd = isWin ? 'npm.cmd' : 'npm';
      args = ['run', 'start'];
      cwd = path.join(__dirname, '..');
    }

    nextServer = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
    });

    nextServer.stdout?.on('data', (d) => console.log('[next]', d.toString().trim()));
    nextServer.stderr?.on('data', (d) => console.error('[next-err]', d.toString().trim()));
    nextServer.on('error', reject);
    resolve();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'POS System - Zenthoz Technologies',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Show loading splash
function createSplash() {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false },
    icon: path.join(__dirname, 'icon.png'),
    resizable: false,
  });

  const splashHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    margin: 0; background: #0f172a;
    display: flex; align-items: center; justify-content: center;
    height: 100vh; font-family: system-ui; color: white; flex-direction: column;
    -webkit-app-region: drag;
  }
  .logo { font-size: 48px; margin-bottom: 16px; }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
  p { margin: 0 0 24px; color: #94a3b8; font-size: 13px; }
  .spinner { width: 32px; height: 32px; border: 3px solid #1e3a5f; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
  .status { margin-top: 12px; color: #64748b; font-size: 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="logo">🏪</div>
  <h1>POS System</h1>
  <p>Powered by Zenthoz Technologies</p>
  <div class="spinner"></div>
  <div class="status">Starting application...</div>
</body>
</html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  return splash;
}

// IPC handlers
ipcMain.handle('get-machine-id', () => getMachineId());
ipcMain.handle('app-version', () => app.getVersion());

app.whenReady().then(async () => {
  ensureDataDir();
  writeEnvFile();
  loadEnvFile();

  const splash = createSplash();

  try {
    await startNextServer();
    await waitForServer(PORT);
    splash.destroy();
    createWindow();
  } catch (err) {
    console.error('Failed to start server:', err);
    splash.destroy();
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start POS system server.\n\n${err.message}\n\nPlease restart the application.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
