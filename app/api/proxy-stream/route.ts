import { NextRequest } from 'next/server';
import { apiBaseUrl } from '@/lib/apiBaseUrl';

// MJPEG는 끝나지 않는 스트림이라, Next가 정적/캐시로 취급해 응답을 끝까지
// 버퍼링해버리면 화면에 아무것도 안 뜬다. force-dynamic + no-store로 고정.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return new Response('Invalid stream URL', { status: 400 });
  }

  const expectedOrigin = new URL(apiBaseUrl).origin;
  const isPlantStream = /^\/api\/web\/plants\/stream\/[A-Za-z0-9._~-]+$/.test(target.pathname);
  if (target.origin !== expectedOrigin || !isPlantStream || target.search || target.hash ||
      target.username || target.password) {
    return new Response('Only signed backend plant-stream URLs are allowed', { status: 400 });
  }

  try {
    const response = await fetch(target, { cache: 'no-store', redirect: 'manual' });

    if (!response.ok || response.status >= 300 || !response.body) {
      return new Response('Failed to fetch stream', { status: response.status || 502 });
    }

    // multipart/x-mixed-replace;boundary=... 값을 그대로 넘겨야 <img>가 파싱 가능
    const contentType = response.headers.get('Content-Type');
    if (!contentType?.includes('multipart/x-mixed-replace')) {
      return new Response('Unexpected content-type from stream source', { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Proxy stream error:', error);
    return new Response('Internal Server Error while proxying stream', { status: 500 });
  }
}
