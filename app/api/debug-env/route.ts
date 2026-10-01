import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — apagar depois de resolver o problema.
// Protegida pelo CRON_SECRET. Não retorna nenhum valor secreto, só se existem.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .replace(/^"|"$/g, '');

  return NextResponse.json({
    node: process.version,
    memoriaRssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
    temClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    temPrivateKey: !!privateKey,
    privateKeyFormatoValido:
      !!privateKey?.startsWith('-----BEGIN PRIVATE KEY-----') &&
      !!privateKey?.includes('-----END PRIVATE KEY-----'),
    temZapiInstanceId: !!process.env.ZAPI_INSTANCE_ID,
    temZapiToken: !!process.env.ZAPI_TOKEN,
    temZapiClientToken: !!process.env.ZAPI_CLIENT_TOKEN,
    temCronSecret: true,
  });
}