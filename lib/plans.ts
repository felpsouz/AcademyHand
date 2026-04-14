export const PLANS = {
  gi: {
    label: 'Gi (com kimono)',
    mensal:      { valor: 120    },
    trimestral:  { valor: 306    },
    semestral:   { valor: 540    },
    anual:       { valor: 936    },
  },
  nogi: {
    label: 'No-Gi (sem kimono)',
    mensal:      { valor: 80     },
    trimestral:  { valor: 204    },
    semestral:   { valor: 540    },
    anual:       { valor: 624    },
  },
  completo: {
    label: 'Gi + No-Gi',
    mensal:      { valor: 150    },
    trimestral:  { valor: 382.50 },
    semestral:   { valor: 675    },
    anual:       { valor: 1170   },
  },
  kids: {
    label: 'GI Kids',
    mensal:      { valor: 100    },
    trimestral:  { valor: 255    },
    semestral:   { valor: 450    },
    anual:       { valor: 780    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';