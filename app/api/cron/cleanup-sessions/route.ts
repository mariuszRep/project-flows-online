import { NextResponse } from 'next/server';
import { SessionManager } from '@/lib/mcp/session-manager';

function getAuthError(): NextResponse {
  return new NextResponse(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'CRON_SECRET is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return getAuthError();
  }

  try {
    const result = await SessionManager.cleanupExpiredSessions();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Cron] Cleanup sessions failed:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Cleanup failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
