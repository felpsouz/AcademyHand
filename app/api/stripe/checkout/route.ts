import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PlanKey, Periodicidade } from '@/lib/plans';

// Tipos de cobrança
type CheckoutMode = 'subscription' | 'payment';

interface SubscriptionBody {
  mode: 'subscription';
  studentId: string;
  studentEmail: string;
  studentName: string;
  plano: PlanKey;
  periodicidade: Periodicidade;
}

interface PaymentBody {
  mode: 'payment';
  studentId: string;
  studentEmail: string;
  studentName: string;
  description: string;
  amount: number; // em reais
}

type Body = SubscriptionBody | PaymentBody;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body;

    if (body.mode === 'subscription') {
      // Assinatura recorrente
      const priceId = process.env[
        `STRIPE_PRICE_${body.plano.toUpperCase()}_${body.periodicidade.toUpperCase()}`
      ]!;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card', 'boleto'],
        customer_email: body.studentEmail,
        locale: 'pt-BR',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          studentId: body.studentId,
          studentName: body.studentName,
          plano: body.plano,
          periodicidade: body.periodicidade,
          type: 'subscription',
        },
        subscription_data: {
          metadata: {
            studentId: body.studentId,
            plano: body.plano,
            periodicidade: body.periodicidade,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}?stripe=sucesso`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}?stripe=cancelado`,
      });

      return NextResponse.json({ url: session.url });

    } else {
      // Cobrança avulsa
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'boleto', 'pix'],
        customer_email: body.studentEmail,
        locale: 'pt-BR',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: body.description,
                metadata: { studentId: body.studentId },
              },
              unit_amount: Math.round(body.amount * 100), // converte para centavos
            },
            quantity: 1,
          },
        ],
        metadata: {
          studentId: body.studentId,
          studentName: body.studentName,
          type: 'one_time',
          description: body.description,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}?stripe=sucesso`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}?stripe=cancelado`,
      });

      return NextResponse.json({ url: session.url });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 });
  }
}