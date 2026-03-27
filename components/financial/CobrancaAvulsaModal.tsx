'use client'

import { useState } from 'react';
import { Student } from '@/types';

interface Props {
  student: Student;
  onClose: () => void;
}

const PRODUTOS_PREDEFINIDOS = [
  { label: 'Kimono/Uniforme', valor: 150 },
  { label: 'Taxa de Graduação (Troca de Faixa)', valor: 80 },
];

export const CobrancaAvulsaModal: React.FC<Props> = ({ student, onClose }) => {
  const [tipo, setTipo] = useState<'predefinido' | 'livre'>('predefinido');
  const [produtoIdx, setProdutoIdx] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGerar = async () => {
    setLoading(true);
    try {
      const description = tipo === 'predefinido'
        ? PRODUTOS_PREDEFINIDOS[produtoIdx].label
        : descricao;
      const amount = tipo === 'predefinido'
        ? PRODUTOS_PREDEFINIDOS[produtoIdx].valor
        : parseFloat(valor.replace(',', '.'));

      if (!description || !amount || amount <= 0) {
        alert('Preencha todos os campos');
        return;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          studentId: student.id,
          studentEmail: student.email,
          studentName: student.name,
          description,
          amount,
        }),
      });

      const { url } = await res.json();
      navigator.clipboard.writeText(url);
      alert(`Link copiado! Envie para ${student.name}`);
      onClose();
    } catch {
      alert('Erro ao gerar cobrança');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => setTipo('predefinido')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
            tipo === 'predefinido'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Produto pré-definido
        </button>
        <button
          onClick={() => setTipo('livre')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
            tipo === 'livre'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Valor livre
        </button>
      </div>

      {tipo === 'predefinido' ? (
        <div className="space-y-2">
          {PRODUTOS_PREDEFINIDOS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setProdutoIdx(idx)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                produtoIdx === idx
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <span className="text-sm font-medium text-gray-800">{p.label}</span>
              <span className="text-sm font-bold text-indigo-700">
                R$ {p.valor.toFixed(2).replace('.', ',')}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Taxa de evento, Material..."
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Valor (R$)</label>
            <input
              type="text"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
        <p className="font-medium">Formas de pagamento disponíveis:</p>
        <p className="mt-1 text-gray-500">Cartão de crédito/débito · PIX · Boleto</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleGerar}
          disabled={loading}
          className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? 'Gerando...' : 'Gerar link'}
        </button>
      </div>
    </div>
  );
};