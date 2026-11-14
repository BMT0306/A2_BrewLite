import { NextRequest, NextResponse } from 'next/server';

/**
 * @file route.ts
 * @description Next.js App Router Proxy Handler cho SePay Webhook IPN
 * Tiếp nhận thông báo biến động số dư từ SePay (hoặc Cloudflare tunnel) và chuyển tiếp tới Backend API
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000';

    console.log('[Next.js Webhook Proxy] Nhận Webhook từ SePay, đang chuyển tiếp tới:', `${backendUrl}/payments/sepay-webhook`);

    const res = await fetch(`${backendUrl}/payments/sepay-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[Next.js Webhook Proxy Error]:', err.message);
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi chuyển tiếp Webhook tới Backend API' },
      { status: 500 },
    );
  }
}
