import { NextRequest, NextResponse } from 'next/server';
import { processarTodosLembretes } from '@/lib/lembretes';

export const maxDuration = 60;

// GET /api/cron/lembretes-pagamento — chamado 1x por dia pelo Vercel Cron.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resultado = await processarTodosLembretes();
  return NextResponse.json({ ok: true, ...resultado });
}