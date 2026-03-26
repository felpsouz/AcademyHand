import Stripe from 'stripe';
import { PLANS } from './plans';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export { PLANS };
export type { PlanKey, Periodicidade } from './plans';