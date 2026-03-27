switch (event.type) {
  case 'checkout.session.completed': {
    const session = event.data.object as Stripe.CheckoutSession;
    const { studentId, plano, periodicidade, type, description } = session.metadata ?? {};

    if (type === 'subscription' && studentId) {
      // Assinatura normal
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
      // Cobrança avulsa
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
    // ... sua lógica existente
    break;
  }

  case 'invoice.payment_failed': {
    // ... sua lógica existente
    break;
  }

  case 'customer.subscription.deleted': {
    // ... sua lógica existente
    break;
  }

  default:
    console.log(`Unhandled event type ${event.type}`);
}
