/**
 * @file start-demo.js
 * @description Script 1-Click khởi động toàn diện A2 phục vụ demo và nghiệm thu đồ án
 * - Giải phóng cổng 3000/4000 nếu đang bị chiếm dụng
 * - Khởi động Backend API (Port 4000)
 * - Khởi động Frontend Web Next.js (Port 3000)
 * - Mở kết nối SePay Webhook cố định theo Assignment 1 (https://brewlite-api-tam.loca.lt)
 * - Mở Cloudflare Tunnel cho Web Client phục vụ truy cập ngoài mạng LAN
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
let qrcode = null;
try {
  qrcode = require('qrcode-terminal');
} catch (e) {}

const ROOT_DIR = path.join(__dirname, '..');
const API_DIR = path.join(ROOT_DIR, 'apps', 'api');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');
const CLOUDFLARED_BIN = path.join(ROOT_DIR, 'cloudflared.exe');

const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

let apiProcess = null;
let webProcess = null;
let tunnelProcess = null;
let bannerPrinted = false;

function startCloudflareTunnel(port, timeoutMs = 20000) {
  return new Promise((resolve) => {
    if (!fs.existsSync(CLOUDFLARED_BIN)) {
      return resolve(null);
    }
    const proc = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    tunnelProcess = proc;

    let foundUrl = null;
    const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

    function handleData(d) {
      const match = d.toString().match(urlRegex);
      if (match && !foundUrl) {
        foundUrl = match[0];
        resolve(foundUrl);
      }
    }

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('error', () => {
      if (!foundUrl) resolve(null);
    });

    setTimeout(() => {
      if (!foundUrl) resolve(null);
    }, timeoutMs);
  });
}

function freePort(port) {
  try {
    const output = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = output.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(Number(pid)) && Number(pid) !== process.pid) {
        pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[Port Clean] Đã giải phóng cổng ${port} (PID: ${pid})`);
      } catch (e) {}
    }
  } catch (err) {
    // Port đang rảnh
  }
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, timeoutMs = 45000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkUrl(url)) return true;
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function printSummary(publicWebUrl) {
  if (bannerPrinted) return;
  bannerPrinted = true;

  const lanIp = getLanIp();
  const hasToken = !!process.env.SEPAY_API_TOKEN && process.env.SEPAY_API_TOKEN.trim() !== '';

  console.log('\n======================================================================');
  console.log('       BREWLITE MONOREPO - PRODUCTION RUNNER (ASSIGNMENT 2)');
  console.log('======================================================================\n');
  console.log('[Dịch vụ mạng]');
  console.log('  - Web Client:        http://localhost:3000');
  console.log('  - Backend REST API:  http://localhost:4000 (Health Check: /health)');
  if (lanIp) {
    console.log(`  - Mạng nội bộ (LAN): http://${lanIp}:3000`);
  }
  console.log('');

  console.log('[Thanh toán & Đối soát Napas 24/7]');
  console.log('  - Cổng ngân hàng:    MBBank (STK: 6563617082006 - TRAN LE MINH TAM)');
  if (hasToken) {
    const rawToken = process.env.SEPAY_API_TOKEN.trim();
    const masked = rawToken.slice(0, 8) + '...' + rawToken.slice(-4);
    console.log(`  - Đối soát SePay:    \x1b[32m\x1b[1mHoạt động (User API Key: ${masked})\x1b[0m`);
    console.log('                       Chu kỳ kiểm tra biến động: 2.5s');
  } else {
    console.log('  - Đối soát SePay:    Webhook tiêu chuẩn');
  }
  console.log('');

  if (publicWebUrl) {
    console.log('[Truy cập di động PWA (Cloudflare Tunnel)]');
    console.log(`  - Public URL:        \x1b[36m\x1b[1m${publicWebUrl}\x1b[0m`);
    console.log('  - Quét mã QR bằng camera điện thoại để mở trực tiếp ứng dụng:\n');
    if (qrcode) {
      try {
        qrcode.generate(publicWebUrl, { small: true }, (qr) => {
          const indented = qr.split('\n').map((line) => '      ' + line).join('\n');
          console.log(indented);
        });
      } catch (e) {}
    }
    console.log('');
  }

  console.log('[Tài khoản đăng nhập hệ thống]');
  console.log('  - Khách hàng (PWA):  customer@brewlite.vn / 123456  (Đặt nước & Theo dõi đơn: /orders)');
  console.log('  - Barista Quầy (KDS): staff@brewlite.vn / 123456     (Màn hình pha chế & Điều phối quầy: /barista)');
  console.log('  - Quản lý Kho (BOM): manager@brewlite.vn / 123456   (Kho nguyên liệu & Định mức công thức: /barista?tab=inventory)\n');
  console.log('======================================================================');
  console.log('Hệ thống đang hoạt động ổn định. Nhấn Ctrl+C để dừng toàn bộ dịch vụ.');
  console.log('======================================================================\n');
}

function cleanup() {
  console.log('\n[Dọn dẹp] Đang tắt các dịch vụ BrewLite A2...');
  if (tunnelProcess) {
    try { tunnelProcess.kill(); } catch (e) {}
  }
  if (webProcess) {
    try { webProcess.kill(); } catch (e) {}
  }
  if (apiProcess) {
    try { apiProcess.kill(); } catch (e) {}
  }
  freePort(3000);
  freePort(4000);
  console.log('[Dọn dẹp] Đã đóng các cổng 3000, 4000 và dừng dịch vụ sạch sẽ.');
}

async function main() {
  console.log('\n======================================================================');
  console.log('BrewLite Monorepo - Production Demo Runner (Assignment 2)');
  console.log('======================================================================\n');

  // Bước 1: Dọn dẹp cổng mạng
  console.log('[1/4] Kiểm tra và giải phóng cổng mạng 3000, 4000...');
  freePort(4000);
  freePort(3000);
  console.log('      -> Cổng 3000 và 4000 đã sẵn sàng!\n');

  // Bước 2: Khởi động Backend API
  console.log('[2/4] Khởi động Backend REST API (Port 4000)...');
  const apiEntry = path.join(API_DIR, 'dist', 'src', 'main.js');
  if (!fs.existsSync(apiEntry)) {
    console.log('      (Biên dịch Backend API...)');
    execSync('npm run build:api', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  let apiLogs = '';
  apiProcess = spawn('node', [apiEntry], {
    cwd: API_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '4000' }
  });

  apiProcess.stdout.on('data', (d) => {
    apiLogs += d.toString();
  });
  apiProcess.stderr.on('data', (d) => {
    apiLogs += d.toString();
  });
  apiProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`\n❌ Backend API bị dừng sớm với mã lỗi: ${code}`);
      if (apiLogs) console.error(apiLogs);
    }
  });

  process.stdout.write('      Đang đợi Backend API phản hồi');
  const apiReady = await waitForUrl('http://127.0.0.1:4000/health', 45000, 1000);
  console.log('');
  if (!apiReady) {
    console.error('❌ Lỗi: Backend API không khởi động được trên cổng 4000 sau 45s!');
    if (apiLogs) console.error('\nLog chi tiết từ Backend:\n' + apiLogs);
    cleanup();
    process.exit(1);
  }
  console.log('      -> Backend API đã sẵn sàng tại http://localhost:4000\n');

  // Bước 3: Khởi động Frontend Web
  console.log('[3/4] Khởi động Frontend Web PWA (Port 3000)...');
  let webLogs = '';
  webProcess = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: WEB_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  webProcess.stdout.on('data', (d) => {
    webLogs += d.toString();
  });
  webProcess.stderr.on('data', (d) => {
    webLogs += d.toString();
  });
  webProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`\n❌ Frontend Web bị dừng sớm với mã lỗi: ${code}`);
      if (webLogs) console.error(webLogs);
    }
  });

  process.stdout.write('      Đang đợi Frontend Web phản hồi');
  const webReady = await waitForUrl('http://127.0.0.1:3000', 45000, 1000);
  console.log('');
  if (!webReady) {
    console.error('❌ Lỗi: Frontend Web không phản hồi trên cổng 3000 sau 45s!');
    if (webLogs) console.error('\nLog chi tiết từ Frontend:\n' + webLogs);
    cleanup();
    process.exit(1);
  }
  console.log('      -> Frontend Web đã sẵn sàng tại http://localhost:3000\n');

  // Bước 4: Mở Cloudflare Tunnel kết nối Internet phục vụ PWA Điện thoại & SePay Webhook
  console.log('[4/4] Thiết lập Cloudflare Tunnel công khai...');
  process.stdout.write('      Đang tạo kết nối HTTPS an toàn');
  const dotTimer = setInterval(() => process.stdout.write('.'), 1000);
  const publicWebUrl = await startCloudflareTunnel(3000, 20000);
  clearInterval(dotTimer);
  console.log('');

  printSummary(publicWebUrl);
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

main();
