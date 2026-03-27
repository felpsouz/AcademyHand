import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PlanKey, Periodicidade } from '@/lib/plans';

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
  amount: number;
}

type Body = SubscriptionBody | PaymentBody;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Body;

    if (body.mode === 'subscription') {
      const priceId = process.env[
        `STRIPE_PRICE_${body.plano.toUpperCase()}_${body.periodicidade.toUpperCase()}`
      ]!;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
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
      const amount = Number(body.amount);

      if (!amount || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: body.studentEmail,
        locale: 'pt-BR',
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: { name: body.description },
              unit_amount: Math.round(amount * 100),
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

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}