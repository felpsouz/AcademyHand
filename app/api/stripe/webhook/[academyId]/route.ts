import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ academyId: string }> }
) {
  const { academyId } = await params;

  const academyDoc = await adminDb().collection('academies').doc(academyId).get();
  if (!academyDoc.exists) {
    console.error(`Webhook recebido para academia inexistente: ${academyId}`);
    return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 });
  }
  const academyData = academyDoc.data()!;

  if (!academyData.stripeSecretKey || !academyData.stripeWebhookSecret) {
    console.error(`Academia ${academyId} sem Stripe configurado`);
    return NextResponse.json({ error: 'Stripe não configurado para essa academia' }, { status: 400 });
  }

  const stripe = new Stripe(academyData.stripeSecretKey);

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    // A assinatura só valida com a stripeWebhookSecret DESSA academia —
    // isso é o que garante que o evento realmente veio da conta Stripe dela.
    event = stripe.webhooks.constructEvent(body, sig, academyData.stripeWebhookSecret);
  } catch (err: any) {
    console.error('Assinatura do webhook inválida:', err.message);
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
  }

  const db = adminDb();

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { studentId, plano, periodicidade, type, description, academyId: metaAcademyId } = session.metadata ?? {};

      // Checagem extra: o metadata precisa bater com a academia da URL do webhook
      if (metaAcademyId && metaAcademyId !== academyId) {
        console.error(`academyId do metadata (${metaAcademyId}) não bate com a URL (${academyId})`);
        break;
      }

      if (type === 'subscription' && studentId) {
        await db.collection('students').doc(studentId).update({
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          plano,
          periodicidade,
          paymentStatus: 'active',
          stripePaymentStatus: 'active',
          lastPaymentAt: new Date().toISOString(),
        });
      } else if (type === 'one_time' && studentId) {
        await db.collection('payments').add({
          academyId,
          studentId,
          amount: (session.amount_total ?? 0) / 100,
          description: description ?? 'Cobrança avulsa',
          status: 'paid',
          type: 'one_time',
          stripeSessionId: session.id,
          paidAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string | null;
      if (!subscriptionId) break;
      const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
      const studentId = sub.metadata?.studentId;
      if (studentId) {
        await db.collection('students').doc(studentId).update({
          stripePaymentStatus: 'active',
          lastPaymentAt: new Date().toISOString(),
          nextPaymentAt: new Date(sub.current_period_end * 1000).toISOString(),
        });
        await db.collection('payments').add({
          academyId,
          studentId,
          amount: invoice.amount_paid / 100,
          status: 'paid',
          type: 'subscription',
          stripeInvoiceId: invoice.id,
          invoiceUrl: (invoice as any).hosted_invoice_url ?? null,
          paidAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as any).subscription as string | null;
      if (!subscriptionId) break;
      const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
      const studentId = sub.metadata?.studentId;
      if (studentId) {
        await db.collection('students').doc(studentId).update({
          stripePaymentStatus: 'overdue',
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const studentId = sub.metadata?.studentId;
      if (studentId) {
        await db.collection('students').doc(studentId).update({
          stripePaymentStatus: 'cancelled',
          stripeSubscriptionId: null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}