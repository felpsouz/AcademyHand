'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { PlanoAcademia, PERIODICIDADES, PERIODICIDADE_LABELS, PLANOS_PADRAO_JIUJITSU, gerarIdPlano } from '@/lib/plans';

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface PlanosEditorProps {
  planos: PlanoAcademia[];
  onChange: (planos: PlanoAcademia[]) => void;
}

export function PlanosEditor({ planos, onChange }: PlanosEditorProps) {
  const adicionarPlano = () => {
    onChange([
      ...planos,
      {
        id: gerarIdPlano(`plano_${planos.length + 1}`),
        label: '',
        diasPermitidos: [0, 1, 2, 3, 4, 5, 6],
        precos: { mensal: 0 },
      },
    ]);
  };

  const usarModeloJiuJitsu = () => {
    onChange([...planos, ...PLANOS_PADRAO_JIUJITSU]);
  };

  const removerPlano = (index: number) => {
    if (!confirm('Remover esse plano? Alunos que já têm ele atribuído não serão afetados, só some da lista de novos cadastros.')) return;
    onChange(planos.filter((_, i) => i !== index));
  };

  const atualizarPlano = (index: number, changes: Partial<PlanoAcademia>) => {
    onChange(planos.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  };

  const toggleDia = (index: number, dia: number) => {
    const plano = planos[index];
    const jaTem = plano.diasPermitidos.includes(dia);
    const novosDias = jaTem
      ? plano.diasPermitidos.filter(d => d !== dia)
      : [...plano.diasPermitidos, dia].sort();
    atualizarPlano(index, { diasPermitidos: novosDias });
  };

  const atualizarPreco = (index: number, periodo: string, valor: string) => {
    const plano = planos[index];
    const numero = parseFloat(valor.replace(',', '.'));
    const novosPrecos = { ...plano.precos };
    if (!valor || isNaN(numero)) {
      delete (novosPrecos as any)[periodo];
    } else {
      (novosPrecos as any)[periodo] = numero;
    }
    atualizarPlano(index, { precos: novosPrecos });
  };

  return (
    <div className="space-y-4">
      {planos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum plano cadastrado ainda.</p>
      )}

      {planos.map((plano, index) => (
        <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={plano.label}
              onChange={(e) => atualizarPlano(index, {
                label: e.target.value,
                id: plano.id.startsWith('plano_') ? gerarIdPlano(e.target.value) : plano.id,
              })}
              placeholder="Nome do plano (ex: Adulto, Livre, 3x semana)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => removerPlano(index)}
              className="text-gray-400 hover:text-red-600 transition p-1.5"
              title="Remover plano"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Dias permitidos</p>
            <div className="flex gap-1.5 flex-wrap">
              {NOMES_DIAS.map((nome, dia) => (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(index, dia)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    plano.diasPermitidos.includes(dia)
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Preços (deixe em branco pra não oferecer essa periodicidade)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERIODICIDADES.map((periodo) => (
                <div key={periodo}>
                  <label className="text-xs text-gray-400">{PERIODICIDADE_LABELS[periodo]}</label>
                  <input
                    type="text"
                    value={plano.precos[periodo] ?? ''}
                    onChange={(e) => atualizarPreco(index, periodo, e.target.value)}
                    placeholder="R$"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={adicionarPlano}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-red-400 hover:text-red-600 transition"
        >
          <Plus className="w-4 h-4" />
          Novo plano
        </button>
        {planos.length === 0 && (
          <button
            type="button"
            onClick={usarModeloJiuJitsu}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition"
          >
            <Copy className="w-4 h-4" />
            Usar modelo Jiu-Jitsu
          </button>
        )}
      </div>
    </div>
  );
}