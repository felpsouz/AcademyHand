import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
  }

  const db = adminDb();

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { studentId, plano, periodicidade, type, description } = session.metadata ?? {};

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