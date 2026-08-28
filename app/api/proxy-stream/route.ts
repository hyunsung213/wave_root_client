import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return new Response('Failed to fetch stream', { status: response.status });
    }

    // CORS 우회를 위해 헤더를 추가하여 스트림을 전달 (Node.js 서버가 대신 스트림을 받음)
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'multipart/x-mixed-replace',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy stream error:', error);
    return new Response('Internal Server Error while proxying stream', { status: 500 });
  }
}
