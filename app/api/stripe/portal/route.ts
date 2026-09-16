import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { customerId, academyId } = await req.json();

    if (!academyId) {
      return NextResponse.json({ error: 'academyId é obrigatório' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId é obrigatório' }, { status: 400 });
    }

    const academyDoc = await adminDb().collection('academies').doc(academyId).get();
    if (!academyDoc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }
    const academyData = academyDoc.data()!;

    if (!academyData.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado para essa academia' }, { status: 400 });
    }

    const stripe = new Stripe(academyData.stripeSecretKey);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/aluno/pagamento`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao abrir portal' }, { status: 500 });
  }
}