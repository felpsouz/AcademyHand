

// Não criamos mais uma instância global do Stripe aqui — em um sistema
// multi-tenant, cada academia tem sua própria stripeSecretKey (guardada no
// Firestore em academies/{academyId}). Cada rota de API monta a instância
// do Stripe na hora, com `new Stripe(chaveDaAcademia)`, depois de buscar
// essa chave. Ter uma instância global exigiria uma única chave fixa no
// .env, o que não faz sentido aqui.

export type { PlanKey, Periodicidade } from './plans';