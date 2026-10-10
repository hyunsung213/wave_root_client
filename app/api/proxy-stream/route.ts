import { NextRequest } from 'next/server';
import { apiBaseUrl } from '@/lib/apiBaseUrl';

// MJPEG는 끝나지 않는 스트림이라, Next가 정적/캐시로 취급해 응답을 끝까지
// 버퍼링해버리면 화면에 아무것도 안 뜬다. force-dynamic + no-store로 고정.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FRAME_BYTES = 5 * 1024 * 1024;
const MAX_HEADER_BYTES = 64 * 1024;

function getStreamTarget(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== 'string' || !rawUrl) return null;
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }

  const expectedOrigin = new URL(apiBaseUrl).origin;
  const isPlantStream = /^\/api\/web\/plants\/stream\/[A-Za-z0-9._~-]+$/.test(target.pathname);
  if (target.origin !== expectedOrigin || !isPlantStream || target.search || target.hash || target.username || target.password) {
    return null;
  }
  return target;
}

async function readFirstJpeg(body: ReadableStream<Uint8Array>, boundary: string, signal: AbortSignal): Promise<Buffer> {
  const reader = body.getReader();
  const marker = Buffer.from(`--${boundary}`);
  const separator = Buffer.from('\r\n\r\n');
  const nextBoundary = Buffer.from(`\r\n--${boundary}`);
  let buffer = Buffer.alloc(0);

  try {
    while (buffer.length <= MAX_FRAME_BYTES + MAX_HEADER_BYTES) {
      const frameStart = buffer.indexOf(marker);
      const headersEnd = frameStart < 0 ? -1 : buffer.indexOf(separator, frameStart);
      if (frameStart >= 0 && headersEnd >= 0) {
        const headerText = buffer.toString('latin1', frameStart + marker.length, headersEnd);
        const frameContentType = headerText.match(/(?:^|\r?\n)Content-Type:\s*([^;\r\n]+)/i)?.[1].trim().toLowerCase();
        if (frameContentType !== 'image/jpeg') {
          throw new Error('The stream did not provide a JPEG frame.');
        }
        const frameStartIndex = headersEnd + separator.length;
        const lengthMatch = headerText.match(/(?:^|\r?\n)Content-Length:\s*(\d+)/i);
        if (lengthMatch) {
          const frameLength = Number(lengthMatch[1]);
          if (!Number.isSafeInteger(frameLength) || frameLength <= 0 || frameLength > MAX_FRAME_BYTES) {
            throw new Error('The JPEG frame exceeded the allowed size.');
          }
          if (buffer.length >= frameStartIndex + frameLength) return buffer.subarray(frameStartIndex, frameStartIndex + frameLength);
        } else {
          const frameEndIndex = buffer.indexOf(nextBoundary, frameStartIndex);
          if (frameEndIndex >= 0) return buffer.subarray(frameStartIndex, frameEndIndex);
        }
      }

      const result = await reader.read();
      if (result.done) throw new Error('The stream ended before a JPEG frame arrived.');
      buffer = Buffer.concat([buffer, Buffer.from(result.value)]);
      if (signal.aborted) throw new Error('Timed out while reading a JPEG frame.');
    }
    throw new Error('The JPEG frame exceeded the allowed size.');
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const target = getStreamTarget(rawUrl);
  if (!target) {
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

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const rawUrl = body && typeof body === 'object' && 'url' in body ? body.url : null;
  const target = getStreamTarget(rawUrl);
  if (!target) return new Response('Only signed backend plant-stream URLs are allowed', { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, { cache: 'no-store', redirect: 'manual', signal: controller.signal });
    if (!response.ok || response.status >= 300 || !response.body) {
      return new Response('Failed to fetch stream frame', { status: response.status || 502 });
    }
    const contentType = response.headers.get('Content-Type') || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    if (!contentType.toLowerCase().startsWith('multipart/x-mixed-replace') || !boundaryMatch) {
      return new Response('Unexpected content-type from stream source', { status: 502 });
    }

    const boundary = (boundaryMatch[1] || boundaryMatch[2]).replace(/^--/, '');
    const jpeg = await readFirstJpeg(response.body, boundary, controller.signal);
    return new Response(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpeg.byteLength),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Stream frame proxy error:', error);
    return new Response('Failed to capture a stream frame', { status: controller.signal.aborted ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
