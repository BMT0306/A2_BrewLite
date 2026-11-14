import { NextRequest, NextResponse } from 'next/server';

/**
 * @file route.ts
 * @description Catch-all API Route Handler proxying client requests to NestJS Backend API (Port 4000)
 * Giúp mọi thiết bị (Điện thoại qua Cloudflare Tunnel, máy tính trong mạng LAN) gọi API mượt mà, không gặp lỗi CORS hay IP
 */

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000';

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const targetPath = '/' + (params.path || []).join('/');
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_URL}${targetPath}${url.search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      // Bỏ qua các header hop-by-hop hoặc host của Next.js
      if (lower !== 'host' && lower !== 'connection' && lower !== 'content-length') {
        headers.set(key, value);
      }
    });

    const isBodyAllowed = !['GET', 'HEAD'].includes(req.method);
    let body: BodyInit | undefined = undefined;
    if (isBodyAllowed) {
      body = await req.arrayBuffer();
    }

    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const resData = await res.arrayBuffer();
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(resData, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[API Proxy Error]:', err.message);
    return NextResponse.json(
      {
        statusCode: 502,
        message: 'Không thể kết nối tới Backend API máy chủ. Vui lòng kiểm tra tiến trình Backend.',
        error: err.message,
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
