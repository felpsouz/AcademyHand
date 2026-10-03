import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// POST /api/auth/check-academy-status — verifica se a academia do usuário logado está ativa
// e quais recursos opcionais ela tem ligados (ex: agenda de horários).
// Chamado pelo client logo após o login (ou no onAuthStateChanged).
export async function POST(request: Request) {
  try {
    const authHeader =
      request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);

    // Se a inicialização do Admin falhar (env ausente/errada), cai no catch externo (500)
    const auth = adminAuth();

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (error: any) {
      console.error('[check-academy-status] ERRO AO VALIDAR TOKEN:', {
        name: error?.name,
        code: error?.code,
        message: error?.message,
      });
      return NextResponse.json(
        { error: 'Token inválido ou expirado', code: error?.code ?? null },
        { status: 401 }
      );
    }

    const userDoc = await adminDb().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Master nunca é bloqueado por status de academia (e não pertence a nenhuma)
    if (userData.role === 2) {
      return NextResponse.json({ ativa: true, usaAgenda: false });
    }

    if (!userData.academyId) {
      return NextResponse.json({ ativa: false, motivo: 'Usuário sem academia vinculada' });
    }

    const academyDoc = await adminDb()
      .collection('academies')
      .doc(userData.academyId)
      .get();

    if (!academyDoc.exists) {
      return NextResponse.json({ ativa: false, motivo: 'Academia não encontrada' });
    }

    const academia = academyDoc.data();
    const ativa = academia?.ativa !== false;

    return NextResponse.json({
      ativa,
      motivo: ativa ? null : 'Academia suspensa',
      usaAgenda: ativa && academia?.usaAgenda === true,
    });
  } catch (error: any) {
    console.error('[check-academy-status] Erro interno:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });
    return NextResponse.json({ error: 'Erro interno ao verificar status' }, { status: 500 });
  }
}