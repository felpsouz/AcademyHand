import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb, verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Confirma quem está fazendo a requisição
    const usuario = await verifyUserRequest(req);

    const { customerId, academyId } = await req.json();

    if (!academyId) {
      return NextResponse.json({ error: 'academyId é obrigatório' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId é obrigatório' }, { status: 400 });
    }

    // A pessoa logada precisa ser da MESMA academia do portal que está pedindo
    if (usuario.academyId !== academyId && usuario.role !== 2) {
      return NextResponse.json({ error: 'Sem permissão para essa academia' }, { status: 403 });
    }

    const academyDoc = await adminDb().collection('academies').doc(academyId).get();
    if (!academyDoc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }
    const academyData = academyDoc.data()!;

    if (!academyData.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado para essa academia' }, { status: 400 });
    }

    // Confirma que esse customerId realmente pertence a um aluno dessa academia,
    // e que quem está pedindo é o próprio aluno, um admin, ou o master —
    // ninguém pode abrir o portal de assinatura de outra pessoa.
    const studentSnap = await adminDb()
      .collection('students')
      .where('academyId', '==', academyId)
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (studentSnap.empty) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado nessa academia' }, { status: 404 });
    }

    const studentDoc = studentSnap.docs[0];
    const podeAbrir = usuario.uid === studentDoc.id || usuario.role === 0 || usuario.role === 2;
    if (!podeAbrir) {
      return NextResponse.json({ error: 'Sem permissão para abrir esse portal' }, { status: 403 });
    }

    const stripe = new Stripe(academyData.stripeSecretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/aluno/pagamento`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: 'Erro ao abrir portal' }, { status: 500 });
  }
}