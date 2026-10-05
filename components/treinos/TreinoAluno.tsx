'use client'

import React, { useCallback, useEffect, useState } from 'react';
import { Dumbbell, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { PlanoTreino, chamarTreinos } from '@/lib/treinos';

export const TreinoAluno: React.FC = () => {
  const { user, userData } = useAuth();
  const { showToast } = useToast();

  const habilitado = userData?.usaAgenda === true;

  const [plano, setPlano] = useState<PlanoTreino | null>(null);
  const [loading, setLoading] = useState(true);
  const [fichaAtiva, setFichaAtiva] = useState(0);

  const carregar = useCallback(async () => {
    if (!user || !habilitado) {
      setLoading(false);
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const data = await chamarTreinos(idToken);
      setPlano(data.plano ?? null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar o treino', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, habilitado]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Academia sem modo personal: não mostra nada
  if (!habilitado) return null;

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-4">Carregando treino...</p>;
  }

  if (!plano || plano.fichas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
        <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-600 font-medium">Seu treino ainda não foi montado</p>
        <p className="text-sm text-gray-400 mt-1">Assim que o personal prescrever, ele aparece aqui.</p>
      </div>
    );
  }

  const idx = Math.min(fichaAtiva, plano.fichas.length - 1);
  const ficha = plano.fichas[idx];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-red-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{plano.titulo || 'Meu treino'}</h3>
            {plano.atualizadoEm && (
              <p className="text-xs text-gray-400">
                Atualizado em {new Date(plano.atualizadoEm).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {plano.observacoes && (
        <div className="flex items-start gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="whitespace-pre-line">{plano.observacoes}</p>
        </div>
      )}

      {plano.fichas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {plano.fichas.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setFichaAtiva(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                i === idx
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.nome}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-800 mb-3">{ficha.nome}</p>
        <div className="space-y-2">
          {ficha.exercicios.map((e, i) => {
            const seriesReps =
              e.series && e.repeticoes ? `${e.series} x ${e.repeticoes}` : e.series || e.repeticoes;
            return (
              <div key={e.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{e.nome}</p>

                    {(seriesReps || e.carga || e.descanso) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {seriesReps && (
                          <span className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                            {seriesReps}
                          </span>
                        )}
                        {e.carga && (
                          <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            Carga: {e.carga}
                          </span>
                        )}
                        {e.descanso && (
                          <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                            Descanso: {e.descanso}
                          </span>
                        )}
                      </div>
                    )}

                    {e.observacao && <p className="text-xs text-gray-500 mt-2">{e.observacao}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};