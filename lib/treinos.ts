// Tipos e helpers dos treinos prescritos (usados pela API e pelos componentes).

export interface Exercicio {
  id: string;
  nome: string;
  series: string;
  repeticoes: string;
  carga: string;
  descanso: string;
  observacao: string;
}

export interface Ficha {
  id: string;
  nome: string;
  exercicios: Exercicio[];
}

export interface PlanoEdicao {
  titulo: string;
  observacoes: string;
  fichas: Ficha[];
}

export interface PlanoTreino extends PlanoEdicao {
  studentId: string;
  atualizadoEm: string | null;
}

export interface ResumoTreino {
  studentId: string;
  titulo: string;
  totalFichas: number;
  atualizadoEm: string | null;
}

export const LIMITES_TREINO = {
  fichas: 10,
  exercicios: 40,
  titulo: 120,
  observacoes: 2000,
  nome: 120,
  campo: 40,
  observacaoExercicio: 500,
};

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function exercicioVazio(): Exercicio {
  return { id: novoId(), nome: '', series: '', repeticoes: '', carga: '', descanso: '', observacao: '' };
}

export function fichaVazia(indice: number): Ficha {
  return {
    id: novoId(),
    nome: `Treino ${String.fromCharCode(65 + (indice % 26))}`,
    exercicios: [exercicioVazio()],
  };
}

export function planoVazio(): PlanoEdicao {
  return { titulo: '', observacoes: '', fichas: [fichaVazia(0)] };
}

function texto(valor: unknown, max: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

// Limpa e valida o treino recebido (roda no servidor antes de salvar)
export function sanitizarPlano(entrada: any): PlanoEdicao {
  if (!entrada || typeof entrada !== 'object') throw new Error('Treino inválido');

  const fichasEntrada: any[] = Array.isArray(entrada.fichas) ? entrada.fichas : [];
  if (fichasEntrada.length > LIMITES_TREINO.fichas) {
    throw new Error(`Máximo de ${LIMITES_TREINO.fichas} treinos (A, B, C...) por aluno`);
  }

  const fichas: Ficha[] = fichasEntrada
    .map((f, i) => {
      const exerciciosEntrada: any[] = Array.isArray(f?.exercicios) ? f.exercicios : [];
      if (exerciciosEntrada.length > LIMITES_TREINO.exercicios) {
        throw new Error(`Máximo de ${LIMITES_TREINO.exercicios} exercícios por treino`);
      }

      const exercicios: Exercicio[] = exerciciosEntrada
        .map(e => ({
          id: texto(e?.id, 40) || novoId(),
          nome: texto(e?.nome, LIMITES_TREINO.nome),
          series: texto(e?.series, LIMITES_TREINO.campo),
          repeticoes: texto(e?.repeticoes, LIMITES_TREINO.campo),
          carga: texto(e?.carga, LIMITES_TREINO.campo),
          descanso: texto(e?.descanso, LIMITES_TREINO.campo),
          observacao: texto(e?.observacao, LIMITES_TREINO.observacaoExercicio),
        }))
        .filter(e => e.nome);

      return {
        id: texto(f?.id, 40) || novoId(),
        nome: texto(f?.nome, LIMITES_TREINO.nome) || `Treino ${String.fromCharCode(65 + (i % 26))}`,
        exercicios,
      };
    })
    .filter(f => f.exercicios.length > 0);

  if (fichas.length === 0) throw new Error('Adicione pelo menos um treino com exercícios');

  return {
    titulo: texto(entrada.titulo, LIMITES_TREINO.titulo),
    observacoes: texto(entrada.observacoes, LIMITES_TREINO.observacoes),
    fichas,
  };
}

export async function chamarTreinos(
  idToken: string,
  opcoes: { metodo?: 'GET' | 'PUT' | 'DELETE'; studentId?: string; corpo?: unknown } = {}
): Promise<any> {
  const { metodo = 'GET', studentId, corpo } = opcoes;
  const url = studentId ? `/api/treinos?studentId=${encodeURIComponent(studentId)}` : '/api/treinos';

  const res = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Erro ao comunicar com os treinos');
  return data;
}