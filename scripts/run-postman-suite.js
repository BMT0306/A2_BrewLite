/**
 * @file run-postman-suite.js
 * @description Tự động hóa kiểm thử Backend REST API bằng Postman / Newman CLI (Task 4.4 DevOps & QA)
 * @author Kỹ sư Trưởng / DevOps Lead
 * @project BrewLite - Assignment 2 (Software Engineering)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 4000;
const HEALTH_URL = `http://localhost:${PORT}/health`;
const COLLECTION_PATH = path.join(__dirname, '..', 'tests', 'postman', 'BrewLite_API.postman_collection.json');
const ENV_PATH = path.join(__dirname, '..', 'tests', 'postman', 'BrewLite_Local.postman_environment.json');

function checkServerReady(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function waitForServer(retries = 15, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    const isReady = await checkServerReady(HEALTH_URL);
    if (isReady) return true;
    await new Promise((r) => setTimeout(r, delay));
  }
  return false;
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 BREWLITE REST API - POSTMAN AUTOMATED TEST SUITE RUNNER');
  console.log('===============================================================\n');

  let serverProcess = null;
  const isAlreadyRunning = await checkServerReady(HEALTH_URL);

  if (isAlreadyRunning) {
    console.log(`[Info] Backend API server đang chạy trên cổng ${PORT}. Sẵn sàng kiểm thử.`);
  } else {
    console.log(`[Info] Đang khởi động Backend API server trên cổng ${PORT}...`);
    const serverEntry = path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'main.js');
    serverProcess = spawn('node', [serverEntry], {
      stdio: 'pipe',
      detached: false,
    });

    const ready = await waitForServer(20, 1000);
    if (!ready) {
      console.error('[Error] Không thể khởi động Backend API server. Vui lòng kiểm tra lại build.');
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log('[Success] Backend API server đã sẵn sàng!\n');
  }

  console.log('🎯 Đang kích hoạt Newman CLI thực thi Postman Collection...\n');

  try {
    execSync(
      `npx --yes newman run "${COLLECTION_PATH}" -e "${ENV_PATH}"`,
      { stdio: 'inherit' }
    );
    console.log('\n===============================================================');
    console.log('🎉 TẤT CẢ 14 KIỂM THỬ POSTMAN ĐỀU ĐÃ VƯỢT QUA XUẤT SẮC (PASS 100%)!');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('\n❌ Có lỗi xảy ra trong quá trình chạy kiểm thử Postman.');
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log('[Cleanup] Dừng tiến trình server kiểm thử cục bộ...');
      serverProcess.kill();
    }
  }
}

main();

