'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { AgendaSlotAluno, DIAS_SEMANA, chamarAgenda } from '@/lib/agenda';

export const AgendaAluno: React.FC = () => {
  const { user, userData } = useAuth();
  const { showToast } = useToast();

  const habilitada = userData?.usaAgenda === true;

  const [slots, setSlots] = useState<AgendaSlotAluno[]>([]);
  const [limite, setLimite] = useState<number | null>(null);
  const [usados, setUsados] = useState(0);
  const [podeLiberar, setPodeLiberar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user || !habilitada) {
      setLoading(false);
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const data = await chamarAgenda(idToken);
      setSlots(data.slots ?? []);
      setLimite(data.limite ?? null);
      setUsados(data.usados ?? 0);
      setPodeLiberar(data.podeLiberar === true);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar os horários', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, habilitada]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atingiuLimite = limite !== null && usados >= limite;
  const bloqueado = limite === null || atingiuLimite;

  const diasComSlots = useMemo(
    () => DIAS_SEMANA.filter(d => slots.some(s => s.dayOfWeek === d.id)),
    [slots]
  );

  const meus = useMemo(
    () =>
      slots
        .filter(s => s.status === 'meu')
        .sort(
          (a, b) =>
            DIAS_SEMANA.findIndex(d => d.id === a.dayOfWeek) -
              DIAS_SEMANA.findIndex(d => d.id === b.dayOfWeek) || a.time.localeCompare(b.time)
        ),
    [slots]
  );

  const nomeDia = (id: number) => DIAS_SEMANA.find(d => d.id === id)?.longo ?? '';

  const escolher = async (slot: AgendaSlotAluno) => {
    if (!user || bloqueado) return;
    const aviso = podeLiberar ? '' : '\n\nDepois de confirmado, só o personal pode alterar.';
    if (!confirm(`Confirmar treino: ${nomeDia(slot.dayOfWeek)}, ${slot.time}?${aviso}`)) return;

    setBusyId(slot.id);
    try {
      const idToken = await user.getIdToken();
      await chamarAgenda(idToken, { acao: 'reservar', slotId: slot.id });
      showToast('Horário reservado!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao reservar o horário', 'error');
    } finally {
      await carregar();
      setBusyId(null);
    }
  };

  const meuHorario = async (slot: AgendaSlotAluno) => {
    if (!podeLiberar) {
      showToast('Para trocar este horário, fale com o personal.', 'warning');
      return;
    }
    if (!user) return;
    if (!confirm(`Liberar o horário de ${nomeDia(slot.dayOfWeek)}, ${slot.time}?`)) return;

    setBusyId(slot.id);
    try {
      const idToken = await user.getIdToken();
      await chamarAgenda(idToken, { acao: 'liberar', slotId: slot.id });
      showToast('Horário liberado', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao liberar o horário', 'error');
    } finally {
      await carregar();
      setBusyId(null);
    }
  };

  // Academia sem agenda ligada: não mostra nada
  if (!habilitada) return null;

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-4">Carregando horários...</p>;
  }

  return (
    <div className="space-y-4">

      {/* Resumo do plano */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-semibold text-gray-800">Meus horários de treino</h3>
        </div>

        {limite !== null ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(limite, 7) }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < usados ? 'bg-red-600' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">
              <strong>{usados}</strong> de <strong>{limite}</strong> treinos por semana escolhidos
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Seu plano ainda não tem a quantidade de treinos por semana definida. Fale com o personal
            para liberar a escolha dos horários.
          </div>
        )}

        {meus.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {meus.map(s => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {DIAS_SEMANA.find(d => d.id === s.dayOfWeek)?.curto} · {s.time}
              </span>
            ))}
          </div>
        )}

        {atingiuLimite && (
          <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            Você já escolheu todos os treinos do seu plano. Para trocar ou treinar mais vezes, fale com o personal.
          </p>
        )}
      </div>

      {/* Horários por dia */}
      {diasComSlots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
          <p className="text-gray-500 font-medium">Nenhum horário disponível</p>
          <p className="text-sm text-gray-400 mt-1">O personal ainda não liberou a grade de horários.</p>
        </div>
      ) : (
        diasComSlots.map(dia => (
          <div key={dia.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">{dia.longo}</p>
            <div className="flex flex-wrap gap-2">
              {slots
                .filter(s => s.dayOfWeek === dia.id)
                .map(s => {
                  const ocupando = busyId === s.id;

                  if (s.status === 'meu') {
                    return (
                      <button
                        key={s.id}
                        onClick={() => meuHorario(s)}
                        disabled={ocupando}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {s.time}
                      </button>
                    );
                  }

                  if (s.status === 'ocupado') {
                    return (
                      <span
                        key={s.id}
                        title="Horário ocupado"
                        className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-400 line-through cursor-not-allowed"
                      >
                        {s.time}
                      </span>
                    );
                  }

                  return (
                    <button
                      key={s.id}
                      onClick={() => escolher(s)}
                      disabled={bloqueado || ocupando}
                      title={bloqueado ? 'Você não pode escolher mais horários' : 'Escolher este horário'}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        bloqueado
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      } disabled:opacity-70`}
                    >
                      {ocupando ? '...' : s.time}
                    </button>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};