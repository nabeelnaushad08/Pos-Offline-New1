const { app, BrowserWindow, shell, dialog, ipcMain, utilityProcess } = require('electron');
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
const envPath = path.join(dbDir, '.env');
const machineIdPath = path.join(dbDir, 'machine.id');

let mainWindow = null;
let nextProcess = null; // utilityProcess (packaged)
let nextServer = null;  // child_process (dev)
const PORT = 3000;

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
  const hwInfo = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  const baseId = crypto.createHash('sha256').update(hwInfo).digest('hex').slice(0, 16).toUpperCase();
  const machineId = `${baseId.slice(0,4)}-${baseId.slice(4,8)}-${baseId.slice(8,12)}-${baseId.slice(12,16)}`;
  fs.writeFileSync(machineIdPath, machineId, 'utf8');
  return machineId;
}

function writeEnvFile() {
  ensureDataDir();
  const machineId = getMachineId();

  let existingSecret = '';
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    const match = existing.match(/NEXTAUTH_SECRET=(.+)/);
    if (match) existingSecret = match[1].trim();
  }

  const secret = existingSecret || crypto.randomBytes(32).toString('hex');
  const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

  const envContent = [
    `DATABASE_URL=${dbUrl}`,
    `NEXTAUTH_URL=http://localhost:${PORT}`,
    `NEXTAUTH_SECRET=${secret}`,
    `MACHINE_ID=${machineId}`,
    `ELECTRON_MODE=true`,
    `NODE_ENV=production`,
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
        if (res.statusCode < 500) {
          resolve();
        } else {
          scheduleRetry();
        }
      });
      req.on('error', scheduleRetry);
      req.setTimeout(2000, () => { req.destroy(); scheduleRetry(); });
    };
    const scheduleRetry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error(`Server did not start after ${maxAttempts} seconds`));
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
    };

    if (app.isPackaged) {
      // Packaged: use utilityProcess.fork() — runs server.js with Electron's built-in Node
      const standaloneDir = path.join(process.resourcesPath, 'app', '.next', 'standalone');
      const serverJs = path.join(standaloneDir, 'server.js');

      console.log('[main] Starting packaged server from:', serverJs);

      nextProcess = utilityProcess.fork(serverJs, [], {
        cwd: standaloneDir,
        env,
        stdio: 'pipe',
      });

      nextProcess.stdout?.on('data', (d) => console.log('[next]', d.toString().trim()));
      nextProcess.stderr?.on('data', (d) => console.error('[next-err]', d.toString().trim()));
      nextProcess.on('exit', (code) => console.log('[next] process exited with code', code));
      nextProcess.on('spawn', () => {
        console.log('[main] Next.js process spawned');
        resolve();
      });
    } else {
      // Dev: use npm run start
      const isWin = process.platform === 'win32';
      const cwd = path.join(__dirname, '..');

      console.log('[main] Starting dev server from:', cwd);

      nextServer = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'start'], {
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
    }
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

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createSplash() {
  const splash = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: false },
    icon: path.join(__dirname, 'icon.png'),
  });

  const html = `<!DOCTYPE html><html><head><style>
    body { margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center;
      height:100vh; font-family:system-ui; color:white; flex-direction:column; -webkit-app-region:drag; }
    .logo { font-size:52px; margin-bottom:14px; }
    h1 { margin:0 0 6px; font-size:22px; font-weight:700; }
    p { margin:0 0 28px; color:#94a3b8; font-size:13px; }
    .spinner { width:32px; height:32px; border:3px solid #1e3a5f; border-top-color:#3b82f6;
      border-radius:50%; animation:spin 0.8s linear infinite; }
    .status { margin-top:14px; color:#64748b; font-size:12px; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style></head><body>
    <div class="logo">🏪</div>
    <h1>POS System</h1>
    <p>Powered by Zenthoz Technologies</p>
    <div class="spinner"></div>
    <div class="status">Starting, please wait...</div>
  </body></html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return splash;
}

ipcMain.handle('get-machine-id', () => getMachineId());
ipcMain.handle('app-version', () => app.getVersion());

function killServer() {
  if (nextProcess) { try { nextProcess.kill(); } catch(e){} nextProcess = null; }
  if (nextServer)  { try { nextServer.kill();  } catch(e){} nextServer  = null; }
}

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
    console.error('[main] Startup failed:', err);
    killServer();
    splash.destroy();
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start POS System.\n\n${err.message}\n\nPlease restart the application.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', killServer);
