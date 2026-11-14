/**
 * @file tunnel.cjs
 * @description LocalTunnel script cố định Subdomain 'brewlite-api-tam' (Đồng bộ 100% với A1)
 *              URL Webhook SePay cố định vĩnh viễn:
 *              👉 https://brewlite-api-tam.loca.lt/payments/sepay-webhook
 *              Không bị reset địa chỉ mỗi lần bật/tắt!
 * @author Trần Lê Minh Tâm - Kỹ sư Trưởng / Chính 1 (System Architect & DevOps Lead)
 */

const localtunnel = require('localtunnel');

let activeTunnel = null;

async function connect() {
  try {
    console.log('[Tunnel] Đang kết nối port 4000 với Subdomain cố định: brewlite-api-tam...');
    activeTunnel = await localtunnel({
      port: 4000,
      subdomain: 'brewlite-api-tam',
    });

    console.log('\n======================================================================');
    console.log('🎉 TUNNEL CỐ ĐỊNH SEPAY (ĐỒNG BỘ 100% VỚI ASSIGNMENT 1)');
    console.log('======================================================================\n');
    console.log('🔗 [URL WEBHOOK SEPAY CỐ ĐỊNH - KHÔNG BAO GIỜ BỊ RESET]:');
    console.log(`   👉 Dán link này vào SePay: \x1b[32m\x1b[1m${activeTunnel.url}/payments/sepay-webhook\x1b[0m`);
    console.log('   (Chỉ cần dán 1 lần duy nhất trên my.sepay.vn, tắt đi bật lại vẫn giữ nguyên!)\n');
    console.log('💻 Backend đang nhận Webhook tại: http://localhost:4000/payments/sepay-webhook');
    console.log('======================================================================\n');

    activeTunnel.on('close', () => {
      console.log('[Tunnel] Kết nối bị ngắt, đang tự động kết nối lại sau 3s...');
      setTimeout(connect, 3000);
    });

    activeTunnel.on('error', (err) => {
      console.error('[Tunnel Lỗi]:', err.message);
      setTimeout(connect, 3000);
    });
  } catch (err) {
    console.error('[Tunnel Kết nối thất bại]:', err.message);
    setTimeout(connect, 3000);
  }
}

connect();

setInterval(() => {}, 60000);

