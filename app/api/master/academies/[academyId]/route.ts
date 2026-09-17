import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// PATCH /api/master/academies/[academyId] — ativa ou suspende uma academia
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { academyId } = await params;
    const body = await request.json();
    const { ativa } = body;

    if (typeof ativa !== 'boolean') {
      return NextResponse.json({ error: 'Campo "ativa" deve ser true ou false' }, { status: 400 });
    }

    const docRef = adminDb().collection('academies').doc(academyId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }

    await docRef.update({ ativa });

    return NextResponse.json({ id: academyId, ativa });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar academia:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar academia' }, { status: 500 });
  }
}

