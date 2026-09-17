import { NextResponse } from 'next/server';
import { adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Mascara a chave secreta pra nunca trafegar inteira na listagem
function mascararChave(chave?: string): string {
  if (!chave) return '';
  if (chave.length <= 8) return '****';
  return `${chave.slice(0, 7)}...${chave.slice(-4)}`;
}

// GET /api/master/academies — lista todas as academias (sem expor a chave secreta inteira)
export async function GET(request: Request) {
  try {
    await verifyMasterRequest(request);

    const snapshot = await adminDb().collection('academies').orderBy('criadaEm', 'desc').get();

    const academias = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        ativa: data.ativa !== false, // default true se o campo não existir
        criadaEm: data.criadaEm?.toDate?.().toISOString() ?? null,
        stripeSecretKeyMascarada: mascararChave(data.stripeSecretKey),
      };
    });

    return NextResponse.json({ academias });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao listar academias:', error);
    return NextResponse.json({ error: 'Erro interno ao listar academias' }, { status: 500 });
  }
}

// POST /api/master/academies — cria uma nova academia
export async function POST(request: Request) {
  try {
    await verifyMasterRequest(request);

    const body = await request.json();
    const { nome, usaGraduacao, usaFacial, device, stripeSecretKey, stripeWebhookSecret, academyId } = body;

    if (!nome || typeof nome !== 'string') {
      return NextResponse.json({ error: 'Campo "nome" é obrigatório' }, { status: 400 });
    }

    // Gera um ID legível a partir do nome, se não vier um customizado
    const id = (academyId || nome)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const docRef = adminDb().collection('academies').doc(id);
    const existente = await docRef.get();

    if (existente.exists) {
      return NextResponse.json({ error: `Já existe uma academia com o ID "${id}"` }, { status: 409 });
    }

    await docRef.set({
      nome,
      usaGraduacao: usaGraduacao !== false, // default true se não vier explicitamente false
      usaFacial: usaFacial === true,        // default false: leitor facial é opcional
      device: device ?? null,
      stripeSecretKey: stripeSecretKey || null,
      stripeWebhookSecret: stripeWebhookSecret || null,
      ativa: true,
      criadaEm: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id, nome, ativa: true }, { status: 201 });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao criar academia:', error);
    return NextResponse.json({ error: 'Erro interno ao criar academia' }, { status: 500 });
  }
}