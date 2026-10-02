import { NextResponse } from 'next/server';
import { adminAuth, adminDb, normalizePrivateKey } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — apagar depois de resolver o problema.
// Protegida pelo CRON_SECRET. Não retorna nenhum valor secreto.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const resultado: Record<string, unknown> = {
    node: process.version,
    memoriaRssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
    clientEmailTermina: process.env.FIREBASE_CLIENT_EMAIL?.split('@')[1] ?? null,
    temPrivateKey: !!privateKey,
    privateKeyFormatoValidoNormalizada:
      !!privateKey?.startsWith('-----BEGIN PRIVATE KEY-----') &&
      !!privateKey?.includes('-----END PRIVATE KEY-----'),
  };

  try {
    await adminDb().collection('users').limit(1).get();
    resultado.firestore = 'ok';
  } catch (error: any) {
    resultado.firestore = { erro: error?.code ?? error?.name, mensagem: error?.message };
  }

  try {
    await adminAuth().listUsers(1);
    resultado.auth = 'ok';
  } catch (error: any) {
    resultado.auth = { erro: error?.code ?? error?.name, mensagem: error?.message };
  }

  return NextResponse.json(resultado);
}