import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// GET /api/master/academies/[academyId]/users — lista admins e alunos dessa academia
export async function GET(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { academyId } = await params;

    const snapshot = await adminDb()
      .collection('users')
      .where('academyId', '==', academyId)
      .get();

    const usuarios = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name,
          email: data.email,
          role: data.role,
          studentId: data.studentId ?? null,
          criadoEm: data.criadoEm?.toDate?.().toISOString() ?? null,
        };
      })
      // Admins primeiro, depois alunos, cada grupo por nome
      .sort((a, b) => (a.role - b.role) || a.name.localeCompare(b.name));

    return NextResponse.json({ usuarios });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao listar usuários da academia:', error);
    return NextResponse.json({ error: 'Erro interno ao listar usuários' }, { status: 500 });
  }
}