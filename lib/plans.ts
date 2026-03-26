export const PLANS = {
  gi: {
    label: 'Gi (com kimono)',
    mensal:     { valor: 120 },
    trimestral: { valor: 340 },
  },
  nogi: {
    label: 'No-Gi (sem kimono)',
    mensal:     { valor: 80  },
    trimestral: { valor: 230 },
  },
  completo: {
    label: 'Gi + No-Gi',
    mensal:     { valor: 150 },
    trimestral: { valor: 510 },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Periodicidade = 'mensal' | 'trimestral';