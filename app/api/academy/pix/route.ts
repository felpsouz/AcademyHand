import { NextResponse } from 'next/server';
import { adminDb, verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';

// GET /api/academy/pix — qualquer usuário autenticado da academia pode ver
// (o aluno precisa ver pra saber como pagar)
export async function GET(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    const doc = await adminDb().collection('academies').doc(usuario.academyId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }

    const pix = doc.data()?.pix ?? null;
    return NextResponse.json({ pix });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar Pix:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar Pix' }, { status: 500 });
  }
}

// PUT /api/academy/pix — só admin edita o Pix da própria academia
export async function PUT(request: Request) {
  try {
    const usuario = await verifyUserRequest(request);

    if (usuario.role !== 0) {
      return NextResponse.json({ error: 'Apenas admins podem editar o Pix' }, { status: 403 });
    }

    const body = await request.json();
    const { chave, nomeTitular, copiaECola } = body;

    await adminDb().collection('academies').doc(usuario.academyId).update({
      pix: {
        chave: chave || null,
        nomeTitular: nomeTitular || null,
        copiaECola: copiaECola || null,
      },
    });

    return NextResponse.json({ pix: { chave, nomeTitular, copiaECola } });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao salvar Pix:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar Pix' }, { status: 500 });
  }
}