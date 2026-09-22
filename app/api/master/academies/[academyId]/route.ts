import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// GET /api/master/academies/[academyId] — dados completos (inclusive chave Stripe sem máscara)
// Só o master vê isso, por isso a chave vem inteira aqui, diferente da listagem.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { academyId } = await params;
    const doc = await adminDb().collection('academies').doc(academyId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }

    const data = doc.data()!;

    return NextResponse.json({
      id: doc.id,
      nome: data.nome,
      ativa: data.ativa !== false,
      usaGraduacao: data.usaGraduacao !== false,
      usaFacial: data.usaFacial === true,
      device: data.device ?? null,
      stripeSecretKey: data.stripeSecretKey ?? '',
      stripeWebhookSecret: data.stripeWebhookSecret ?? '',
    });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar academia:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar academia' }, { status: 500 });
  }
}

// PATCH /api/master/academies/[academyId] — edita qualquer campo da academia
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ academyId: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { academyId } = await params;
    const body = await request.json();

    const docRef = adminDb().collection('academies').doc(academyId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }

    // Monta o objeto de atualização só com os campos que vieram no body
    const updateData: Record<string, any> = {};

    if (typeof body.ativa === 'boolean') updateData.ativa = body.ativa;
    if (typeof body.nome === 'string' && body.nome.trim()) updateData.nome = body.nome.trim();
    if (typeof body.usaGraduacao === 'boolean') updateData.usaGraduacao = body.usaGraduacao;
    if (typeof body.usaFacial === 'boolean') updateData.usaFacial = body.usaFacial;
    if (body.device !== undefined) updateData.device = body.device;
    if (typeof body.stripeSecretKey === 'string') updateData.stripeSecretKey = body.stripeSecretKey || null;
    if (typeof body.stripeWebhookSecret === 'string') updateData.stripeWebhookSecret = body.stripeWebhookSecret || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    await docRef.update(updateData);

    return NextResponse.json({ id: academyId, ...updateData });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar academia:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar academia' }, { status: 500 });
  }
}