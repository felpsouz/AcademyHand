import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// O Firestore recusa valores `undefined` (comum em objetos de planos/pix vindos do formulário).
// Passar pelo JSON remove essas chaves antes de gravar. Só chamar com valores definidos.
function limpar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor));
}

function mensagemDe(error: unknown): string {
  return (error as any)?.message ?? 'erro desconhecido';
}

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
      usaAgenda: data.usaAgenda === true,
      device: data.device ?? null,
      planos: data.planos ?? [],
      pix: data.pix ?? null,
      lembretesWhatsapp: data.lembretesWhatsapp === true,
      stripeSecretKey: data.stripeSecretKey ?? '',
      stripeWebhookSecret: data.stripeWebhookSecret ?? '',
    });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao buscar academia:', error);
    return NextResponse.json(
      { error: `Erro interno ao buscar academia: ${mensagemDe(error)}` },
      { status: 500 }
    );
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
    if (typeof body.usaAgenda === 'boolean') updateData.usaAgenda = body.usaAgenda;
    if (body.device !== undefined) updateData.device = limpar(body.device);
    if (Array.isArray(body.planos)) updateData.planos = limpar(body.planos);
    if (body.pix !== undefined) updateData.pix = limpar(body.pix);
    if (typeof body.lembretesWhatsapp === 'boolean') updateData.lembretesWhatsapp = body.lembretesWhatsapp;
    if (typeof body.stripeSecretKey === 'string') updateData.stripeSecretKey = body.stripeSecretKey || null;
    if (typeof body.stripeWebhookSecret === 'string') updateData.stripeWebhookSecret = body.stripeWebhookSecret || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 });
    }

    await docRef.update(updateData);

    // Cada usuário guarda uma cópia de nome/graduação/facial da academia (o client não lê "academies").
    // Mantém essas cópias em dia para quem já existe. Se falhar, a tela continua correta, porque
    // o login lê esses valores direto da academia (check-academy-status).
    let usuariosAtualizados = 0;
    const copia: Record<string, any> = {};
    if (updateData.nome !== undefined) copia.academyName = updateData.nome;
    if (updateData.usaGraduacao !== undefined) copia.usaGraduacao = updateData.usaGraduacao;
    if (updateData.usaFacial !== undefined) copia.usaFacial = updateData.usaFacial;

    if (Object.keys(copia).length > 0) {
      try {
        const db = adminDb();
        const usuarios = await db.collection('users').where('academyId', '==', academyId).get();

        for (let i = 0; i < usuarios.docs.length; i += 400) {
          const batch = db.batch();
          usuarios.docs.slice(i, i + 400).forEach(u => batch.update(u.ref, copia));
          await batch.commit();
        }
        usuariosAtualizados = usuarios.size;
      } catch (err) {
        console.error('Erro ao propagar dados da academia para os usuários:', err);
      }
    }

    return NextResponse.json({ id: academyId, ...updateData, usuariosAtualizados });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar academia:', error);
    return NextResponse.json(
      { error: `Erro interno ao atualizar academia: ${mensagemDe(error)}` },
      { status: 500 }
    );
  }
}