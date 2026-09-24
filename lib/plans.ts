export type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';

// Antes cada plano era uma chave fixa ('gi' | 'nogi' | ...). Agora os planos
// são definidos por academia, então a "chave" de um plano é só um id
// (string) gerado na hora que o plano é criado.
export type PlanKey = string;

export interface PlanoAcademia {
  id: string;            // ex: "gi", "adulto-manha" — gerado do label na criação
  label: string;
  diasPermitidos: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  // Só as periodicidades que esse plano realmente oferece aparecem aqui.
  // Uma academia pode ter um plano só mensal, outro com todas as opções, etc.
  precos: Partial<Record<Periodicidade, number>>;
}

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const PERIODICIDADES: Periodicidade[] = ['mensal', 'trimestral', 'semestral', 'anual'];

export const PERIODICIDADE_LABELS: Record<Periodicidade, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

// Modelo pronto (os planos que a academia de Jiu-Jitsu já usava) — oferecido
// como ponto de partida rápido no editor de planos, pra quem não quer
// montar do zero. Não é usado automaticamente em nenhuma academia nova.
export const PLANOS_PADRAO_JIUJITSU: PlanoAcademia[] = [
  {
    id: 'gi',
    label: 'Gi',
    diasPermitidos: [1, 3, 5],
    precos: { mensal: 120, trimestral: 306, semestral: 540, anual: 936 },
  },
  {
    id: 'nogi',
    label: 'No-Gi',
    diasPermitidos: [2, 4],
    precos: { mensal: 80, trimestral: 204, semestral: 360, anual: 624 },
  },
  {
    id: 'kids',
    label: 'Kids',
    diasPermitidos: [2, 4],
    precos: { mensal: 100, trimestral: 255, semestral: 450, anual: 780 },
  },
  {
    id: 'completo',
    label: 'Completo',
    diasPermitidos: [0, 1, 2, 3, 4, 5, 6],
    precos: { mensal: 150, trimestral: 382.5, semestral: 675, anual: 1170 },
  },
];

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

/** Gera um id de plano a partir do label (ex: "Natação Adulto" -> "natacao_adulto") */
export function gerarIdPlano(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `plano_${Date.now()}`;
}