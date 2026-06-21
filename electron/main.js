const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const http = require('http');

const PORT = 3000;
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'pos-data');
const dbPath = path.join(dataDir, 'pos.db');
const envPath = path.join(dataDir, '.env');
const machineIdPath = path.join(dataDir, 'machine.id');
const logPath = path.join(dataDir, 'startup.log');

let mainWindow = null;
let serverProcess = null;

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(logPath, line);
  } catch (_) {}
}

// ─── Data directory ───────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

// ─── Machine ID ───────────────────────────────────────────────────────────────

function getMachineId() {
  ensureDataDir();
  if (fs.existsSync(machineIdPath)) return fs.readFileSync(machineIdPath, 'utf8').trim();
  const hw = `${os.hostname()}-${os.platform()}-${os.arch()}-${(os.cpus()[0] || {}).model || 'cpu'}`;
  const h = crypto.createHash('sha256').update(hw).digest('hex').slice(0, 16).toUpperCase();
  const id = `${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}-${h.slice(12,16)}`;
  fs.writeFileSync(machineIdPath, id, 'utf8');
  return id;
}

// ─── .env file ────────────────────────────────────────────────────────────────

function writeEnvFile() {
  ensureDataDir();
  // Preserve existing NEXTAUTH_SECRET so sessions survive restarts
  let secret = '';
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(/NEXTAUTH_SECRET=(.+)/);
    if (m) secret = m[1].trim();
  }
  if (!secret) secret = crypto.randomBytes(32).toString('hex');

  const content = [
    `DATABASE_URL=file:${dbPath.replace(/\\/g, '/')}`,
    `NEXTAUTH_URL=http://localhost:${PORT}`,
    `NEXTAUTH_SECRET=${secret}`,
    `MACHINE_ID=${getMachineId()}`,
    `ELECTRON_MODE=true`,
    `NODE_ENV=production`,
  ].join('\n');

  fs.writeFileSync(envPath, content, 'utf8');
}

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

// ─── Start Next.js server ─────────────────────────────────────────────────────

function startServer() {
  return new Promise((resolve, reject) => {
    const standaloneDir = app.isPackaged
      ? path.join(process.resourcesPath, 'app', '.next', 'standalone')
      : path.join(__dirname, '..');

    const serverScript = app.isPackaged
      ? path.join(standaloneDir, 'server.js')
      : null; // dev uses npm start

    const env = {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
    };

    let cmd, args;

    if (app.isPackaged) {
      // Use Electron binary in Node mode — official Electron documented technique
      cmd = process.execPath;
      args = [serverScript];
      env.ELECTRON_RUN_AS_NODE = '1';
    } else {
      cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      args = ['run', 'start'];
    }

    log(`spawning: ${cmd} ${args.join(' ')}`);
    log(`cwd: ${standaloneDir}`);
    log(`server.js exists: ${app.isPackaged ? fs.existsSync(args[0]) : 'dev-mode'}`);

    serverProcess = spawn(cmd, args, {
      cwd: standaloneDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    serverProcess.stdout.on('data', (d) => log('[stdout] ' + d.toString().trim()));
    serverProcess.stderr.on('data', (d) => log('[stderr] ' + d.toString().trim()));

    serverProcess.on('error', (err) => {
      log(`spawn error: ${err.message}`);
      reject(err);
    });

    serverProcess.on('exit', (code, signal) => {
      log(`server exited code=${code} signal=${signal}`);
    });

    setTimeout(resolve, 500);
  });
}

// ─── Wait for HTTP server to be ready ─────────────────────────────────────────

function waitForServer(maxSec = 120) {
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
        if (res.statusCode < 500) {
          clearInterval(interval);
          resolve();
        }
      });
      req.on('error', () => {}); // still starting up, ignore
      req.setTimeout(1500, () => req.destroy());

      elapsed++;
      log(`health check attempt ${elapsed}/${maxSec}`);
      if (elapsed >= maxSec) {
        clearInterval(interval);
        reject(new Error(`Server did not respond after ${maxSec} seconds.\nLog file: ${logPath}\nCheck that no other program is using port ${PORT}.`));
      }
    }, 1000);
  });
}

// ─── Windows ──────────────────────────────────────────────────────────────────

function createSplash() {
  const w = new BrowserWindow({
    width: 420, height: 300,
    frame: false, transparent: true,
    alwaysOnTop: true, resizable: false,
    webPreferences: { nodeIntegration: false },
  });
  w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html><html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{background:#0f172a;color:#fff;font-family:system-ui;
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;height:100vh;-webkit-app-region:drag}
      .icon{font-size:56px;margin-bottom:16px}
      h1{font-size:22px;font-weight:700;margin-bottom:4px}
      p{color:#94a3b8;font-size:13px;margin-bottom:32px}
      .spin{width:36px;height:36px;border:3px solid #1e3a5f;
        border-top-color:#3b82f6;border-radius:50%;
        animation:s .8s linear infinite}
      .msg{margin-top:14px;color:#475569;font-size:12px}
      @keyframes s{to{transform:rotate(360deg)}}
    </style></head><body>
      <div class="icon">🏪</div>
      <h1>POS System</h1>
      <p>Powered by Zenthoz Technologies</p>
      <div class="spin"></div>
      <div class="msg">Starting, please wait…</div>
    </body></html>
  `));
  return w;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 1024, minHeight: 600,
    title: 'POS System',
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
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

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.handle('get-machine-id', () => getMachineId());
ipcMain.handle('app-version', () => app.getVersion());

// ─── Lifecycle ────────────────────────────────────────────────────────────────

function killServer() {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM'); } catch (_) {}
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  ensureDataDir();
  // Clear old log on each start
  try { fs.writeFileSync(logPath, ''); } catch (_) {}
  log('=== POS System Starting ===');
  log(`isPackaged: ${app.isPackaged}`);
  log(`resourcesPath: ${process.resourcesPath || 'N/A'}`);
  log(`userData: ${userDataPath}`);

  writeEnvFile();
  loadEnvFile();
  log('env loaded');

  const splash = createSplash();

  try {
    log('starting server...');
    await startServer();
    log('server spawned, waiting for HTTP...');
    await waitForServer();
    log('server ready! opening window.');
    splash.destroy();
    createMainWindow();
  } catch (err) {
    log(`FATAL: ${err.message}`);
    killServer();
    splash.destroy();
    dialog.showErrorBox(
      'POS System — Startup Error',
      `${err.message}\n\nLog file for support:\n${logPath}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', killServer);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
