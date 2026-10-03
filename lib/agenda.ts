// Tipos e helpers da agenda semanal (usados pela API e pelos componentes).

export const DIAS_SEMANA = [
  { id: 1, curto: 'Seg', longo: 'Segunda' },
  { id: 2, curto: 'Ter', longo: 'Terça' },
  { id: 3, curto: 'Qua', longo: 'Quarta' },
  { id: 4, curto: 'Qui', longo: 'Quinta' },
  { id: 5, curto: 'Sex', longo: 'Sexta' },
  { id: 6, curto: 'Sáb', longo: 'Sábado' },
  { id: 0, curto: 'Dom', longo: 'Domingo' },
];

// false = só o personal libera/troca horários (o aluno pede a ele).
// true  = o aluno também pode liberar o próprio horário.
export const ALUNO_PODE_LIBERAR = false;

export const MAX_SLOTS_POR_GERACAO = 300;

export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface AgendaSlotAdmin {
  id: string;
  dayOfWeek: number;
  time: string;
  duration: number;
  studentId: string | null;
  studentName: string | null;
}

export type StatusSlotAluno = 'livre' | 'ocupado' | 'meu';

export interface AgendaSlotAluno {
  id: string;
  dayOfWeek: number;
  time: string;
  duration: number;
  status: StatusSlotAluno;
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number): string {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// ID determinístico: garante que não existam dois horários iguais na mesma academia
export function slotId(academyId: string, dayOfWeek: number, time: string): string {
  return `${academyId}_${dayOfWeek}_${time.replace(':', '')}`;
}

// Gera os horários de início entre "inicio" e "fim", de "duracao" em "duracao" minutos
export function gerarHorarios(inicio: string, fim: string, duracao: number): string[] {
  const fimMin = horaParaMinutos(fim);
  const saida: string[] = [];
  for (let t = horaParaMinutos(inicio); t + duracao <= fimMin; t += duracao) {
    saida.push(minutosParaHora(t));
  }
  return saida;
}

// Quantos treinos por semana o aluno pode escolher.
// 1) campo "vezesPorSemana" do cadastro; 2) se não existir, quantidade de dias do plano.
// null = não definido (o aluno fica bloqueado até o personal definir).
export function resolverLimiteSemanal(student: any): number | null {
  const v = Number(student?.vezesPorSemana);
  if (Number.isInteger(v) && v > 0) return v;

  const dias = student?.diasPermitidos;
  if (Array.isArray(dias) && dias.length > 0 && dias.length < 7) return dias.length;

  return null;
}

export async function chamarAgenda(idToken: string, corpo?: Record<string, unknown>): Promise<any> {
  const res = await fetch('/api/agenda', {
    method: corpo ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Erro ao comunicar com a agenda');
  return data;
}