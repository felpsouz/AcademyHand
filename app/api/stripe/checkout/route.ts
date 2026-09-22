import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb, verifyUserRequest, MasterAuthError } from '@/lib/firebase-admin';
import { PlanKey, Periodicidade, PLANS } from '@/lib/plans';

interface SubscriptionBody {
  mode: 'subscription';
  academyId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  plano: PlanKey;
  periodicidade: Periodicidade;
}

interface PaymentBody {
  mode: 'payment';
  academyId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  description: string;
  amount: number;
}

type Body = SubscriptionBody | PaymentBody;

// Converte a periodicidade do seu sistema para o formato de recorrência do Stripe
function periodicidadeParaRecurring(periodicidade: Periodicidade): Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring {
  switch (periodicidade) {
    case 'mensal':     return { interval: 'month', interval_count: 1 };
    case 'trimestral': return { interval: 'month', interval_count: 3 };
    case 'semestral':  return { interval: 'month', interval_count: 6 };
    case 'anual':      return { interval: 'year', interval_count: 1 };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Confirma quem está fazendo a requisição
    const usuario = await verifyUserRequest(req);

    const body = await req.json() as Body;

    if (!body.academyId) {
      return NextResponse.json({ error: 'academyId é obrigatório' }, { status: 400 });
    }

    // A pessoa logada precisa ser da MESMA academia do checkout que está pedindo
    if (usuario.academyId !== body.academyId && usuario.role !== 2) {
      return NextResponse.json({ error: 'Sem permissão para essa academia' }, { status: 403 });
    }

    // E precisa ser: o próprio aluno pagando por si mesmo, OU um admin/master
    // gerando o link em nome de um aluno. Ninguém pode gerar checkout pra
    // um aluno de outra pessoa sem ser admin daquela academia.
    const podeGerar = usuario.uid === body.studentId || usuario.role === 0 || usuario.role === 2;
    if (!podeGerar) {
      return NextResponse.json({ error: 'Sem permissão para gerar esse checkout' }, { status: 403 });
    }

    // Busca a academia e confirma que ela está ativa e tem chave configurada
    const academyDoc = await adminDb().collection('academies').doc(body.academyId).get();
    if (!academyDoc.exists) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
    }
    const academyData = academyDoc.data()!;

    if (academyData.ativa === false) {
      return NextResponse.json({ error: 'Academia suspensa' }, { status: 403 });
    }

    if (!academyData.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe não configurado para essa academia' }, { status: 400 });
    }

    // Confirma que o aluno realmente pertence a essa academia (evita cruzar dados entre academias)
    const studentDoc = await adminDb().collection('students').doc(body.studentId).get();
    if (!studentDoc.exists || studentDoc.data()?.academyId !== body.academyId) {
      return NextResponse.json({ error: 'Aluno não encontrado nessa academia' }, { status: 404 });
    }

    // Instância do Stripe criada na hora, com a chave da academia certa
    const stripe = new Stripe(academyData.stripeSecretKey);

    if (body.mode === 'subscription') {
      const planoInfo = PLANS[body.plano][body.periodicidade];

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: body.studentEmail,
        locale: 'pt-BR',
        line_items: [{
          price_data: {
            currency: 'brl',
            product_data: { name: `${PLANS[body.plano].label} — ${body.periodicidade}` },
            unit_amount: Math.round(planoInfo.valor * 100),
            recurring: periodicidadeParaRecurring(body.periodicidade),
          },
          quantity: 1,
        }],
        metadata: {
          academyId: body.academyId,
          studentId: body.studentId,
          studentName: body.studentName,
          plano: body.plano,
          periodicidade: body.periodicidade,
          type: 'subscription',
        },
        subscription_data: {
          metadata: {
            academyId: body.academyId,
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
          academyId: body.academyId,
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
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}