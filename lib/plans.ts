export type PlanKey = 'gi' | 'nogi' | 'completo' | 'kids';
export type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export interface PlanPeriod {
  valor: number;
}

export interface Plan {
  label: string;
  diasPermitidos: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  mensal: PlanPeriod;
  trimestral: PlanPeriod;
  semestral: PlanPeriod;
  anual: PlanPeriod;
}

export const PLANS: Record<PlanKey, Plan> = {
  gi: {
    label: 'Gi',
    diasPermitidos: [1, 3, 5], // Segunda, Quarta, Sexta
    mensal:     { valor: 120 },
    trimestral: { valor: 306 },
    semestral:  { valor: 540 },
    anual:      { valor: 936 },
  },
  nogi: {
    label: 'No-Gi',
    diasPermitidos: [2, 4], // Terça, Quinta
    mensal:     { valor: 80 },
    trimestral: { valor: 204 },
    semestral:  { valor: 360 },
    anual:      { valor: 624 },
  },
  kids: {
    label: 'Kids',
    diasPermitidos: [2, 4], // Terça, Quinta
    mensal:     { valor: 100 },
    trimestral: { valor: 255 },
    semestral:  { valor: 450 },
    anual:      { valor: 780 },
  },
  completo: {
    label: 'Completo',
    diasPermitidos: [0, 1, 2, 3, 4, 5, 6], // Semana toda
    mensal:     { valor: 150 },
    trimestral: { valor: 382.50 },
    semestral:  { valor: 675 },
    anual:      { valor: 1170 },
  },
};

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Valida se o aluno pode acessar a academia hoje com base no plano dele.
 * Use isso na tela de leitura facial.
 */
export function validarAcessoHoje(diasPermitidos: number[]): {
  permitido: boolean;
  motivo?: string;
  diasLabel: string;
} {
  const hoje = new Date().getDay();
  const diasLabel = diasPermitidos.map(d => NOMES_DIAS[d]).join(', ');

  if (!diasPermitidos.includes(hoje)) {
    return {
      permitido: false,
      motivo: `Acesso permitido apenas: ${diasLabel}`,
      diasLabel,
    };
  }

  return { permitido: true, diasLabel };
}