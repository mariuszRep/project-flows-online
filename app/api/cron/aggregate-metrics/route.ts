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
    const aggregation = await SessionManager.aggregateMetrics();
    if (!aggregation) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Metrics aggregation unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json({ success: true, aggregation });
  } catch (error) {
    console.error('[Cron] Aggregate metrics failed:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Aggregation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
