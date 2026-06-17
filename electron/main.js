const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const http = require('http');

const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'pos-data');
const dbPath = path.join(dbDir, 'pos.db');
const envPath = path.join(dbDir, '.env');
const machineIdPath = path.join(dbDir, 'machine.id');

let mainWindow = null;
let nextServer = null;
const PORT = 3099; // Use non-standard port to avoid conflicts

function ensureDataDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

function getMachineId() {
  ensureDataDir();
  if (fs.existsSync(machineIdPath)) {
    return fs.readFileSync(machineIdPath, 'utf8').trim();
  }
  const hwInfo = `${os.hostname()}-${os.platform()}-${os.arch()}-${(os.cpus()[0] || {}).model || 'cpu'}`;
  const base = crypto.createHash('sha256').update(hwInfo).digest('hex').slice(0, 16).toUpperCase();
  const machineId = `${base.slice(0,4)}-${base.slice(4,8)}-${base.slice(8,12)}-${base.slice(12,16)}`;
  fs.writeFileSync(machineIdPath, machineId, 'utf8');
  return machineId;
}

function getOrCreateSecret() {
  ensureDataDir();
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/NEXTAUTH_SECRET=(.+)/);
    if (match) return match[1].trim();
  }
  return crypto.randomBytes(32).toString('hex');
}

function writeEnvFile() {
  ensureDataDir();
  const machineId = getMachineId();
  const secret = getOrCreateSecret();
  const dbUrlPath = dbPath.replace(/\\/g, '/');
  const envContent = [
    `DATABASE_URL=file:${dbUrlPath}`,
    `NEXTAUTH_URL=http://localhost:${PORT}`,
    `NEXTAUTH_SECRET=${secret}`,
    `MACHINE_ID=${machineId}`,
    `ELECTRON_MODE=true`,
    `NODE_ENV=production`,
    `PORT=${PORT}`,
    `HOSTNAME=127.0.0.1`,
  ].join('\n');
  fs.writeFileSync(envPath, envContent, 'utf8');
}

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key) process.env[key] = val;
    }
  }
}

function waitForServer(port, maxAttempts = 90) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Server did not start after ${maxAttempts} seconds`));
        } else {
          setTimeout(check, 1000);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('Server timeout'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    setTimeout(check, 2000); // give it 2s head start
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const isPacked = app.isPackaged;
    const cwd = isPacked
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..');

    const isWin = process.platform === 'win32';
    const env = { ...process.env };

    let cmd, args;
    if (isPacked) {
      // In packaged mode, run the standalone server.js directly
      const standaloneServer = path.join(cwd, '.next', 'standalone', 'server.js');
      if (fs.existsSync(standaloneServer)) {
        cmd = process.execPath;
        args = [standaloneServer];
      } else {
        // Fallback to npm start
        cmd = isWin ? 'npm.cmd' : 'npm';
        args = ['run', 'start'];
      }
    } else {
      cmd = isWin ? 'npm.cmd' : 'npm';
      args = ['run', 'start'];
    }

    console.log(`[electron] Starting: ${cmd} ${args.join(' ')} in ${cwd}`);

    nextServer = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: isWin && !isPacked,
    });

    nextServer.stdout?.on('data', (d) => console.log('[next]', d.toString().trim()));
    nextServer.stderr?.on('data', (d) => console.error('[next-err]', d.toString().trim()));
    nextServer.on('error', reject);
    nextServer.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[electron] Next.js exited with code ${code}`);
      }
    });

    resolve();
  });
}

function createSplash() {
  const splash = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: white; -webkit-app-region: drag; overflow: hidden;
  }
  .icon { font-size: 52px; margin-bottom: 16px; filter: drop-shadow(0 4px 16px rgba(59,130,246,0.5)); }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.5px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 32px; }
  .spinner-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(59,130,246,0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  .status { color: #475569; font-size: 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="icon">🏪</div>
  <h1>POS System</h1>
  <p class="sub">Powered by Zenthoz Technologies</p>
  <div class="spinner-wrap">
    <div class="spinner"></div>
    <div class="status">Starting application, please wait...</div>
  </div>
</body>
</html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return splash;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    title: 'POS System',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Disable right-click context menu in production
  if (app.isPackaged) {
    mainWindow.webContents.on('context-menu', (e) => e.preventDefault());
  }

  mainWindow.on('closed', () => { mainWindow = null; });
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
    createMainWindow();
  } catch (err) {
    console.error('[electron] Startup error:', err);
    splash.destroy();
    dialog.showErrorBox(
      'POS System - Startup Error',
      `Failed to start the POS server.\n\n${err.message}\n\nPlease restart the application. If the problem persists, contact Zenthoz Technologies.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) { nextServer.kill(); nextServer = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on('before-quit', () => {
  if (nextServer) { nextServer.kill(); nextServer = null; }
});
