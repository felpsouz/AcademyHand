'use client'

import { useState } from 'react';
import { Student } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firebase/firestore';

interface Props {
  student: Student;
  onClose: () => void;
}

const PRODUTOS_PREDEFINIDOS = [
  { label: 'Kimono/Uniforme', valor: 150 },
  { label: 'Taxa de Graduação (Troca de Faixa)', valor: 80 },
];

const FORMAS_PAGAMENTO_MANUAL = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'Pix' },
  { value: 'cartao',   label: 'Cartão (fora do Stripe)' },
];

export const CobrancaAvulsaModal: React.FC<Props> = ({ student, onClose }) => {
  const { user, userData } = useAuth();
  const academyId = userData?.academyId;

  const [tipo, setTipo] = useState<'predefinido' | 'livre'>('predefinido');
  const [produtoIdx, setProdutoIdx] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [jaRecebido, setJaRecebido] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [loading, setLoading] = useState(false);

  const getDescricaoEValor = () => {
    const description = tipo === 'predefinido'
      ? PRODUTOS_PREDEFINIDOS[produtoIdx].label
      : descricao;
    const amount = tipo === 'predefinido'
      ? PRODUTOS_PREDEFINIDOS[produtoIdx].valor
      : parseFloat(valor.replace(',', '.'));
    return { description, amount };
  };

  // Marca como já recebido em dinheiro/Pix — grava direto como pagamento,
  // sem gerar nenhum link do Stripe. É isso que faz esse valor contar na
  // receita do dashboard mesmo sem passar pelo Stripe.
  const handleMarcarComoRecebido = async () => {
    if (!academyId) {
      alert('Academia não identificada. Faça login novamente.');
      return;
    }

    const { description, amount } = getDescricaoEValor();
    if (!description || !amount || amount <= 0) {
      alert('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await firestoreService.addDocument('payments', {
        academyId,
        studentId: student.id,
        amount,
        description,
        status: 'paid',
        type: 'one_time',
        paymentMethod: formaPagamento,
        source: 'manual',
        paidAt: new Date().toISOString(),
      } as any);

      if (typeof window !== 'undefined' && (window as any).refreshDashboard) {
        (window as any).refreshDashboard();
      }

      alert(`Cobrança de ${student.name} registrada como paga!`);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar cobrança');
    } finally {
      setLoading(false);
    }
  };

  const handleGerar = async () => {
    if (!academyId || !user) {
      alert('Academia não identificada. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      const { description, amount } = getDescricaoEValor();

      if (!description || !amount || amount <= 0) {
        alert('Preencha todos os campos');
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'payment',
          academyId,
          studentId: student.id,
          studentEmail: student.email,
          studentName: student.name,
          description,
          amount,
        }),
      });

      const data = await res.json();
      console.log('Resposta checkout:', data);

      if (!data.url) {
        alert(`Erro: ${data.error ?? 'URL não gerada'}`);
        return;
      }

      navigator.clipboard.writeText(data.url);
      alert(`Link copiado! Envie para ${student.name}`);
      onClose();
    } catch (err) {
      console.error(err);
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

      {/* Toggle: gerar link Stripe vs marcar como já pago em dinheiro/Pix */}
      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <input
            type="checkbox"
            checked={jaRecebido}
            onChange={(e) => setJaRecebido(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Já recebi esse valor agora (dinheiro/Pix/cartão fora do Stripe)
        </label>

        {jaRecebido ? (
          <div className="mb-2">
            <label className="text-sm font-medium text-gray-600">Forma de pagamento</label>
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {FORMAS_PAGAMENTO_MANUAL.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            <p className="font-medium">Formas de pagamento disponíveis no link:</p>
            <p className="mt-1 text-gray-500">Cartão de crédito/débito · PIX · Boleto</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        {jaRecebido ? (
          <button
            onClick={handleMarcarComoRecebido}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading ? 'Salvando...' : 'Confirmar recebimento'}
          </button>
        ) : (
          <button
            onClick={handleGerar}
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? 'Gerando...' : 'Gerar link'}
          </button>
        )}
      </div>
    </div>
  );
};