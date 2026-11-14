/**
 * @file run-postman-suite.js
 * @description Tự động hóa kiểm thử Backend REST API bằng Postman / Newman CLI (Task 4.4 DevOps & QA)
 * @author Kỹ sư Trưởng / DevOps Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const fs = require('fs');

const PORT = 4000;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;
const COLLECTION_PATH = path.join(__dirname, '..', 'tests', 'postman', 'BrewLite_API.postman_collection.json');
const ENV_PATH = path.join(__dirname, '..', 'tests', 'postman', 'BrewLite_Local.postman_environment.json');

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(retries = 35, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const isReady =
      (await checkServerReady(`http://127.0.0.1:${PORT}/health`)) ||
      (await checkServerReady(`http://localhost:${PORT}/health`));
    if (isReady) return true;
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(Number(pid)) && Number(pid) !== process.pid) {
          try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (e) {}
        }
      }
    } else {
      try {
        const pids = execSync(`lsof -t -i :${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf-8' }).trim().split(/\s+/);
        for (const pid of pids) {
          const numPid = Number(pid);
          if (pid && !isNaN(numPid) && numPid !== process.pid && numPid !== process.ppid) {
            try { process.kill(numPid, 'SIGKILL'); } catch (e) {}
          }
        }
      } catch (e) {}
    }
  } catch (err) {}
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 BREWLITE REST API - POSTMAN AUTOMATED TEST SUITE RUNNER');
  console.log('===============================================================\n');

  const rootDir = path.join(__dirname, '..');
  const apiDir = path.join(rootDir, 'apps', 'api');
  const serverEntry = path.join(apiDir, 'dist', 'src', 'main.js');

  // Đảm bảo mã nguồn API đã được biên dịch sẵn sàng
  if (!fs.existsSync(serverEntry)) {
    console.log('[Info] Đang biên dịch mã nguồn Backend API...');
    execSync('npm run build:api', { cwd: rootDir, stdio: 'inherit' });
  }

  // Giải phóng cổng 4000 và đợi OS thu hồi socket
  freePort(PORT);
  await new Promise((r) => setTimeout(r, 1000));

  console.log(`[Info] Đang khởi động Backend API server trên cổng ${PORT}...`);
  let apiLogs = '';
  const serverProcess = spawn('node', [serverEntry], {
    cwd: apiDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '4000' },
  });

  serverProcess.stdout.on('data', (d) => {
    apiLogs += d.toString();
  });
  serverProcess.stderr.on('data', (d) => {
    apiLogs += d.toString();
  });
  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`\n❌ Backend API bị dừng sớm với mã lỗi: ${code}`);
      if (apiLogs) console.error(apiLogs);
    }
  });

  process.stdout.write('      Đang đợi Backend API phản hồi');
  const ready = await waitForServer(35, 1000);
  console.log('');

  if (!ready) {
    console.error('[Error] Không thể khởi động Backend API server sau 35s. Vui lòng kiểm tra lại build.');
    if (apiLogs) console.error('\nLog chi tiết từ Backend:\n' + apiLogs);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
  console.log('[Success] Backend API server đã sẵn sàng!\n');

  console.log('🎯 Đang kích hoạt Newman CLI thực thi Postman Collection...\n');

  let testFailed = false;
  try {
    execSync(
      `npx --yes newman run "${COLLECTION_PATH}" -e "${ENV_PATH}"`,
      { stdio: 'inherit' }
    );
    console.log('\n===============================================================');
    console.log('🎉 TẤT CẢ 30 KIỂM THỬ POSTMAN ĐỀU ĐÃ VƯỢT QUA XUẤT SẮC (PASS 100%)!');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('\n❌ Có lỗi xảy ra trong quá trình chạy kiểm thử Postman.');
    testFailed = true;
  } finally {
    console.log('[Cleanup] Dừng tiến trình server kiểm thử cục bộ...');
    try {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Cleanup serverProcess error]:', e.message);
    }
    console.log('[Cleanup] Hoàn tất dọn dẹp tiến trình.');
  }

  console.log(`[Suite Result] testFailed=${testFailed}. Exiting now.`);
  if (testFailed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[Unhandled in main]:', err);
  process.exit(1);
});

