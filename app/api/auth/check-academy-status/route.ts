import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// POST /api/auth/check-academy-status — verifica se a academia do usuário logado está ativa
// Chamado pelo client logo após o login (ou no onAuthStateChanged).
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 401 });
    }

    const idToken = authHeader.slice('Bearer '.length);
    const decoded = await adminAuth().verifyIdToken(idToken);

    const userDoc = await adminDb().collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Master nunca é bloqueado por status de academia
    if (userData.role === 2) {
      return NextResponse.json({ ativa: true });
    }

    const academyDoc = await adminDb().collection('academies').doc(userData.academyId).get();

    if (!academyDoc.exists) {
      return NextResponse.json({ ativa: false, motivo: 'Academia não encontrada' });
    }

    const ativa = academyDoc.data()?.ativa !== false;

    return NextResponse.json({ ativa, motivo: ativa ? null : 'Academia suspensa' });
  } catch (error) {
    console.error('Erro ao verificar status da academia:', error);
    return NextResponse.json({ error: 'Erro interno ao verificar status' }, { status: 500 });
  }
}