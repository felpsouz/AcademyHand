import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS, PlanKey, Periodicidade } from '@/lib/plans';

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentEmail, studentName, plano, periodicidade } = await req.json() as {
      studentId: string;
      studentEmail: string;
      studentName: string;
      plano: PlanKey;
      periodicidade: Periodicidade;
    };

    const priceId = process.env[`STRIPE_PRICE_${plano.toUpperCase()}_${periodicidade.toUpperCase()}`]!;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: studentEmail,
      locale: 'pt-BR',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { studentId, studentName, plano, periodicidade },
      subscription_data: {
        metadata: { studentId, plano, periodicidade },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/aluno/pagamento?status=sucesso`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/aluno/pagamento?status=cancelado`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 });
  }
}