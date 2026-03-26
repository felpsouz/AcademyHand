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
  } catch {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 });
  }

  const db = adminDb();

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession;
      const { studentId, plano, periodicidade } = session.metadata ?? {};
      if (studentId) {
        await db.collection('students').doc(studentId).update({
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          plano,
          periodicidade,
          paymentStatus: 'active',
          stripePaymentStatus: 'active',
          lastPaymentAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
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
          stripeInvoiceId: invoice.id,
          invoiceUrl: invoice.hosted_invoice_url,
          paidAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
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