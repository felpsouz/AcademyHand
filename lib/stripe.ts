import Stripe from 'stripe';
import { PLANS } from './plans';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export { PLANS };
export type { PlanKey, Periodicidade } from './plans';