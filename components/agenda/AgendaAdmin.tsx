'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, RefreshCw, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Student } from '@/types';
import {
  AgendaSlotAdmin,
  DIAS_SEMANA,
  chamarAgenda,
  gerarHorarios,
  resolverLimiteSemanal,
} from '@/lib/agenda';

interface AgendaAdminProps {
  students: Student[];
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900';

export const AgendaAdmin: React.FC<AgendaAdminProps> = ({ students }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [slots, setSlots] = useState<AgendaSlotAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // modal de um horário
  const [selecionado, setSelecionado] = useState<AgendaSlotAdmin | null>(null);
  const [alunoId, setAlunoId] = useState('');
  const [ignorarLimite, setIgnorarLimite] = useState(false);

  // modal de montar grade
  const [showGerar, setShowGerar] = useState(false);
  const [gerarDias, setGerarDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [gerarInicio, setGerarInicio] = useState('06:00');
  const [gerarFim, setGerarFim] = useState('12:00');
  const [gerarDuracao, setGerarDuracao] = useState(60);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const data = await chamarAgenda(idToken);
      setSlots(data.slots ?? []);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar a agenda', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const executar = async (corpo: Record<string, unknown>, sucesso: string) => {
    if (!user) return;
    setBusy(true);
    try {
      const idToken = await user.getIdToken();
      await chamarAgenda(idToken, corpo);
      showToast(sucesso, 'success');
      setSelecionado(null);
      setShowGerar(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao executar a ação', 'error');
    } finally {
      await carregar();
      setBusy(false);
    }
  };

  // ── dados derivados ─────────────────────────────────────────────────────────

  const horarios = useMemo(
    () => Array.from(new Set(slots.map(s => s.time))).sort(),
    [slots]
  );

  const diasComSlots = useMemo(
    () => DIAS_SEMANA.filter(d => slots.some(s => s.dayOfWeek === d.id)),
    [slots]
  );

  const mapa = useMemo(() => {
    const m = new Map<string, AgendaSlotAdmin>();
    slots.forEach(s => m.set(`${s.dayOfWeek}_${s.time}`, s));
    return m;
  }, [slots]);

  const usadosPorAluno = useMemo(() => {
    const r: Record<string, number> = {};
    slots.forEach(s => {
      if (s.studentId) r[s.studentId] = (r[s.studentId] ?? 0) + 1;
    });
    return r;
  }, [slots]);

  const alunosAtivos = useMemo(
    () => students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  );

  const ocupados = slots.filter(s => s.studentId).length;

  // ── modal de horário ────────────────────────────────────────────────────────

  const abrirSlot = (slot: AgendaSlotAdmin) => {
    setSelecionado(slot);
    setAlunoId('');
    setIgnorarLimite(false);
  };

  const diaSel = selecionado ? DIAS_SEMANA.find(d => d.id === selecionado.dayOfWeek) : null;
  const alunoSel = alunosAtivos.find(a => a.id === alunoId) ?? null;
  const limiteSel = alunoSel ? resolverLimiteSemanal(alunoSel) : null;
  const usadosSel = alunoSel ? (usadosPorAluno[alunoSel.id] ?? 0) : 0;
  const precisaExcecao = !!alunoSel && (limiteSel === null || usadosSel >= limiteSel);

  // ── montar grade ────────────────────────────────────────────────────────────

  const toggleDia = (id: number) =>
    setGerarDias(prev => (prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]));

  const previa = gerarHorarios(gerarInicio, gerarFim, gerarDuracao).length;

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-red-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Agenda semanal</h2>
            <p className="text-xs text-gray-500">
              {slots.length} horários · {ocupados} ocupados · {slots.length - ocupados} livres
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={carregar}
            disabled={busy}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => setShowGerar(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Montar grade
          </button>
        </div>
      </div>

      {/* Calendário */}
      {slots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhum horário criado ainda</p>
          <p className="text-sm text-gray-400 mt-1">
            Clique em &quot;Montar grade&quot; para definir os dias e horários disponíveis para os alunos.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Livre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600" /> Ocupado
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-14" />
                  {diasComSlots.map(d => (
                    <th key={d.id} className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase">
                      {d.curto}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map(h => (
                  <tr key={h}>
                    <td className="pr-2 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</td>
                    {diasComSlots.map(d => {
                      const slot = mapa.get(`${d.id}_${h}`);
                      if (!slot) {
                        return (
                          <td key={d.id}>
                            <div className="h-12 min-w-[88px] rounded-lg bg-gray-50" />
                          </td>
                        );
                      }
                      const ocupado = !!slot.studentId;
                      return (
                        <td key={d.id}>
                          <button
                            onClick={() => abrirSlot(slot)}
                            title={ocupado ? (slot.studentName ?? '') : 'Horário livre'}
                            className={`h-12 w-full min-w-[88px] px-2 rounded-lg text-xs font-medium truncate transition ${
                              ocupado
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {ocupado ? (slot.studentName ?? 'Aluno').split(' ')[0] : 'Livre'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Treinos por aluno */}
      {alunosAtivos.length > 0 && slots.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Treinos escolhidos por aluno</h3>
          <div className="flex flex-wrap gap-2">
            {alunosAtivos.map(a => {
              const usados = usadosPorAluno[a.id] ?? 0;
              const limite = resolverLimiteSemanal(a);
              const completo = limite !== null && usados >= limite;
              return (
                <span
                  key={a.id}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    completo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : usados > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  {a.name.split(' ')[0]} · {usados}/{limite ?? '?'}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: um horário */}
      <Modal
        isOpen={!!selecionado}
        onClose={() => setSelecionado(null)}
        title={selecionado ? `${diaSel?.longo ?? ''} · ${selecionado.time}` : ''}
        size="lg"
      >
        {selecionado && !selecionado.studentId && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reservar para o aluno</label>
              <select value={alunoId} onChange={e => setAlunoId(e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {alunosAtivos.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({usadosPorAluno[a.id] ?? 0}/{resolverLimiteSemanal(a) ?? '?'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Entre parênteses: treinos escolhidos / limite do plano.</p>
            </div>

            {precisaExcecao && (
              <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignorarLimite}
                  onChange={e => setIgnorarLimite(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-amber-800">Ignorar limite do plano</p>
                  <p className="text-xs text-amber-700">
                    {limiteSel === null
                      ? 'Esse aluno não tem "vezes por semana" definido.'
                      : `Esse aluno já está com ${usadosSel} de ${limiteSel} treinos.`}
                  </p>
                </div>
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  if (!confirm('Remover este horário da grade?')) return;
                  executar({ acao: 'remover', slotId: selecionado.id }, 'Horário removido');
                }}
                disabled={busy}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition text-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remover horário
              </button>
              <button
                onClick={() =>
                  executar(
                    { acao: 'reservar', slotId: selecionado.id, studentId: alunoId, ignorarLimite },
                    'Horário reservado'
                  )
                }
                disabled={busy || !alunoId || (precisaExcecao && !ignorarLimite)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {busy ? 'Salvando...' : 'Reservar'}
              </button>
            </div>
          </div>
        )}

        {selecionado && selecionado.studentId && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs text-indigo-600 font-medium">Aluno neste horário</p>
              <p className="text-lg font-semibold text-indigo-900 mt-0.5">{selecionado.studentName}</p>
            </div>
            <p className="text-xs text-gray-500">
              Para trocar o aluno de horário, libere este e reserve outro para ele.
            </p>
            <button
              onClick={() => {
                if (!confirm(`Liberar o horário de ${selecionado.studentName}?`)) return;
                executar({ acao: 'liberar', slotId: selecionado.id }, 'Horário liberado');
              }}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
            >
              <UserMinus className="w-4 h-4" />
              {busy ? 'Salvando...' : 'Liberar horário'}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal: montar grade */}
      <Modal isOpen={showGerar} onClose={() => setShowGerar(false)} title="Montar grade de horários" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Cria os horários disponíveis. Horários que já existem (inclusive os com aluno) não são alterados.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dias da semana</label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDia(d.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                    gerarDias.includes(d.id)
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d.curto}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primeiro treino</label>
              <input type="time" value={gerarInicio} onChange={e => setGerarInicio(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fim da grade</label>
              <input type="time" value={gerarFim} onChange={e => setGerarFim(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração</label>
              <select value={gerarDuracao} onChange={e => setGerarDuracao(Number(e.target.value))} className={inputClass}>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {previa > 0
              ? `${previa} horários por dia × ${gerarDias.length} dias = ${previa * gerarDias.length} horários`
              : 'O intervalo precisa comportar pelo menos um treino.'}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowGerar(false)}
              disabled={busy}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                executar(
                  { acao: 'gerar', dias: gerarDias, inicio: gerarInicio, fim: gerarFim, duracao: gerarDuracao },
                  'Grade atualizada'
                )
              }
              disabled={busy || previa === 0 || gerarDias.length === 0}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
            >
              {busy ? 'Criando...' : 'Criar horários'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};