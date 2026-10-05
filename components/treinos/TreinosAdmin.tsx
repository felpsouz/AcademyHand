'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Student } from '@/types';
import {
  Exercicio,
  Ficha,
  LIMITES_TREINO,
  PlanoEdicao,
  ResumoTreino,
  chamarTreinos,
  exercicioVazio,
  fichaVazia,
  planoVazio,
} from '@/lib/treinos';

interface TreinosAdminProps {
  students: Student[];
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-gray-900';

export const TreinosAdmin: React.FC<TreinosAdminProps> = ({ students }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [resumo, setResumo] = useState<Record<string, ResumoTreino>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecaoRef = useRef<string | null>(null);
  const [plano, setPlano] = useState<PlanoEdicao>(planoVazio());
  const [alterado, setAlterado] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [fichaAberta, setFichaAberta] = useState(0);

  // ── carregamento ────────────────────────────────────────────────────────────

  const carregarResumo = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const data = await chamarTreinos(idToken);
      const mapa: Record<string, ResumoTreino> = {};
      (data.planos ?? []).forEach((p: ResumoTreino) => {
        mapa[p.studentId] = p;
      });
      setResumo(mapa);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar os treinos', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return students
      .filter(s => !termo || s.name.toLowerCase().includes(termo))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [students, busca]);

  const alunoSel = students.find(s => s.id === selecionadoId) ?? null;

  const aplicarPlano = (p: any) =>
    setPlano(
      p
        ? { titulo: p.titulo ?? '', observacoes: p.observacoes ?? '', fichas: p.fichas ?? [] }
        : planoVazio()
    );

  const selecionar = async (aluno: Student) => {
    if (aluno.id === selecionadoId || !user) return;
    if (alterado && !confirm('Há alterações não salvas neste treino. Descartar e trocar de aluno?')) return;

    selecaoRef.current = aluno.id;
    setSelecionadoId(aluno.id);
    setCarregandoPlano(true);
    setAlterado(false);
    setFichaAberta(0);

    try {
      const idToken = await user.getIdToken();
      const data = await chamarTreinos(idToken, { studentId: aluno.id });
      if (selecaoRef.current !== aluno.id) return; // o personal já trocou de aluno
      aplicarPlano(data.plano);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar o treino do aluno', 'error');
      if (selecaoRef.current === aluno.id) setPlano(planoVazio());
    } finally {
      if (selecaoRef.current === aluno.id) setCarregandoPlano(false);
    }
  };

  // ── edição ──────────────────────────────────────────────────────────────────

  const editar = (fn: (p: PlanoEdicao) => PlanoEdicao) => {
    setPlano(fn);
    setAlterado(true);
  };

  const atualizarFicha = (fi: number, patch: Partial<Ficha>) =>
    editar(p => ({ ...p, fichas: p.fichas.map((f, i) => (i === fi ? { ...f, ...patch } : f)) }));

  const atualizarExercicio = (fi: number, ei: number, patch: Partial<Exercicio>) =>
    editar(p => ({
      ...p,
      fichas: p.fichas.map((f, i) =>
        i !== fi
          ? f
          : { ...f, exercicios: f.exercicios.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
      ),
    }));

  const adicionarFicha = () => {
    if (plano.fichas.length >= LIMITES_TREINO.fichas) {
      showToast(`Máximo de ${LIMITES_TREINO.fichas} treinos por aluno`, 'warning');
      return;
    }
    editar(p => ({ ...p, fichas: [...p.fichas, fichaVazia(p.fichas.length)] }));
    setFichaAberta(plano.fichas.length);
  };

  const removerFicha = (fi: number) => {
    if (!confirm(`Remover "${plano.fichas[fi]?.nome}" e todos os exercícios dele?`)) return;
    editar(p => ({ ...p, fichas: p.fichas.filter((_, i) => i !== fi) }));
    setFichaAberta(0);
  };

  const adicionarExercicio = (fi: number) => {
    if (plano.fichas[fi].exercicios.length >= LIMITES_TREINO.exercicios) {
      showToast(`Máximo de ${LIMITES_TREINO.exercicios} exercícios por treino`, 'warning');
      return;
    }
    editar(p => ({
      ...p,
      fichas: p.fichas.map((f, i) =>
        i === fi ? { ...f, exercicios: [...f.exercicios, exercicioVazio()] } : f
      ),
    }));
  };

  const removerExercicio = (fi: number, ei: number) =>
    editar(p => ({
      ...p,
      fichas: p.fichas.map((f, i) =>
        i === fi ? { ...f, exercicios: f.exercicios.filter((_, j) => j !== ei) } : f
      ),
    }));

  const moverExercicio = (fi: number, ei: number, dir: -1 | 1) =>
    editar(p => ({
      ...p,
      fichas: p.fichas.map((f, i) => {
        if (i !== fi) return f;
        const alvo = ei + dir;
        if (alvo < 0 || alvo >= f.exercicios.length) return f;
        const lista = [...f.exercicios];
        [lista[ei], lista[alvo]] = [lista[alvo], lista[ei]];
        return { ...f, exercicios: lista };
      }),
    }));

  // ── salvar / remover ────────────────────────────────────────────────────────

  const salvar = async () => {
    if (!user || !selecionadoId) return;

    const fichasValidas = plano.fichas.map(f => ({
      ...f,
      exercicios: f.exercicios.filter(e => e.nome.trim()),
    }));

    if (fichasValidas.length === 0) {
      showToast('Adicione pelo menos um treino', 'error');
      return;
    }
    const vazia = fichasValidas.find(f => f.exercicios.length === 0);
    if (vazia) {
      showToast(`O "${vazia.nome || 'treino'}" está sem exercícios`, 'error');
      return;
    }

    setSalvando(true);
    try {
      const idToken = await user.getIdToken();
      const data = await chamarTreinos(idToken, {
        metodo: 'PUT',
        corpo: { studentId: selecionadoId, plano: { ...plano, fichas: fichasValidas } },
      });
      aplicarPlano(data.plano);
      setAlterado(false);
      showToast('Treino salvo!', 'success');
      await carregarResumo();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar o treino', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const removerPlano = async () => {
    if (!user || !selecionadoId) return;
    if (!confirm('Remover todo o treino deste aluno? Ele deixa de ver o treino no perfil.')) return;

    setSalvando(true);
    try {
      const idToken = await user.getIdToken();
      await chamarTreinos(idToken, { metodo: 'DELETE', studentId: selecionadoId });
      setPlano(planoVazio());
      setAlterado(false);
      setFichaAberta(0);
      showToast('Treino removido', 'success');
      await carregarResumo();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover o treino', 'error');
    } finally {
      setSalvando(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const idxFicha = Math.min(fichaAberta, Math.max(plano.fichas.length - 1, 0));
  const ficha = plano.fichas[idxFicha];
  const temTreinoSalvo = !!(selecionadoId && resumo[selecionadoId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Lista de alunos */}
      <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-1 self-start">
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {alunosFiltrados.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum aluno encontrado</p>
          )}
          {alunosFiltrados.map(a => {
            const r = resumo[a.id];
            const ativo = a.id === selecionadoId;
            return (
              <button
                key={a.id}
                onClick={() => selecionar(a)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center justify-between gap-2 ${
                  ativo ? 'bg-red-50 border border-red-200' : 'border border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                  {a.status !== 'active' && <p className="text-xs text-gray-400">Inativo</p>}
                </div>
                {r ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">
                    {r.totalFichas} {r.totalFichas === 1 ? 'treino' : 'treinos'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 whitespace-nowrap">Sem treino</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="lg:col-span-2">
        {!alunoSel ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Selecione um aluno</p>
            <p className="text-sm text-gray-400 mt-1">Escolha na lista para montar ou editar o treino dele.</p>
          </div>
        ) : carregandoPlano ? (
          <div className="bg-white rounded-lg shadow-sm flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-5 h-5 text-red-600" />
                <div>
                  <h2 className="font-semibold text-gray-900">Treino de {alunoSel.name}</h2>
                  <p className="text-xs text-gray-500">
                    {temTreinoSalvo ? 'O aluno já vê este treino no perfil dele.' : 'Ainda não salvo: o aluno não vê nada até você salvar.'}
                  </p>
                </div>
              </div>
              {temTreinoSalvo && (
                <button
                  onClick={removerPlano}
                  disabled={salvando}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50 whitespace-nowrap"
                >
                  Remover treino
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo / título</label>
                <input
                  type="text"
                  value={plano.titulo}
                  onChange={e => editar(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Hipertrofia — fase 1"
                  maxLength={LIMITES_TREINO.titulo}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações gerais</label>
                <textarea
                  value={plano.observacoes}
                  onChange={e => editar(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Orientações para o aluno (aquecimento, alimentação, cuidados...)"
                  rows={2}
                  maxLength={LIMITES_TREINO.observacoes}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Abas dos treinos (A, B, C...) */}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              {plano.fichas.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setFichaAberta(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    i === idxFicha
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.nome || `Treino ${i + 1}`}
                </button>
              ))}
              <button
                onClick={adicionarFicha}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Treino
              </button>
            </div>

            {ficha ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ficha.nome}
                    onChange={e => atualizarFicha(idxFicha, { nome: e.target.value })}
                    placeholder="Nome do treino (ex: Treino A — Peito e tríceps)"
                    maxLength={LIMITES_TREINO.nome}
                    className={inputClass}
                  />
                  <button
                    onClick={() => removerFicha(idxFicha)}
                    title="Remover este treino"
                    className="px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {ficha.exercicios.map((e, ei) => (
                    <div key={e.id} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-semibold text-gray-400 w-5 text-center">{ei + 1}</span>
                        <input
                          type="text"
                          value={e.nome}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { nome: ev.target.value })}
                          placeholder="Exercício (ex: Supino reto)"
                          maxLength={LIMITES_TREINO.nome}
                          className={inputClass}
                        />
                        <button
                          onClick={() => moverExercicio(idxFicha, ei, -1)}
                          disabled={ei === 0}
                          title="Subir"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moverExercicio(idxFicha, ei, 1)}
                          disabled={ei === ficha.exercicios.length - 1}
                          title="Descer"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removerExercicio(idxFicha, ei)}
                          title="Remover exercício"
                          className="p-1.5 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                        <input
                          type="text"
                          value={e.series}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { series: ev.target.value })}
                          placeholder="Séries"
                          maxLength={LIMITES_TREINO.campo}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={e.repeticoes}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { repeticoes: ev.target.value })}
                          placeholder="Repetições"
                          maxLength={LIMITES_TREINO.campo}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={e.carga}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { carga: ev.target.value })}
                          placeholder="Carga"
                          maxLength={LIMITES_TREINO.campo}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          value={e.descanso}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { descanso: ev.target.value })}
                          placeholder="Descanso"
                          maxLength={LIMITES_TREINO.campo}
                          className={inputClass}
                        />
                      </div>

                      <div className="pl-7">
                        <input
                          type="text"
                          value={e.observacao}
                          onChange={ev => atualizarExercicio(idxFicha, ei, { observacao: ev.target.value })}
                          placeholder="Observação (opcional): cadência, técnica, cuidado..."
                          maxLength={LIMITES_TREINO.observacaoExercicio}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => adicionarExercicio(idxFicha)}
                  className="w-full py-2 border border-dashed border-gray-300 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar exercício
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum treino criado. Clique em &quot;+ Treino&quot; para começar.
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-amber-600">{alterado ? 'Alterações não salvas' : ''}</p>
              <button
                onClick={salvar}
                disabled={salvando || !alterado}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {salvando ? 'Salvando...' : 'Salvar treino'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};