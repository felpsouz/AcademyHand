'use client'

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar, Download, Search } from 'lucide-react';
import { StripeTab } from './StripeTab';
import { useStudents } from '@/hooks/useStudents';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firebase/firestore';
import { formatCurrency } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Movimentacao {
  id: string;
  studentId: string;
  studentName?: string;
  amount: number;
  description?: string;
  type: 'subscription' | 'one_time';
  paymentMethod?: string;
  source?: string; // 'manual' quando veio do botão "Pago"/cobrança avulsa manual; ausente = veio do Stripe
  paidAt: string;
}

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function hojeStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const FinancialTab: React.FC = () => {
  const { students, loading } = useStudents();
  const { userData } = useAuth();
  const academyId = userData?.academyId;

  const stripeActive   = students.filter(s => s.stripePaymentStatus === 'active').length;
  const stripeOverdue  = students.filter(s => s.stripePaymentStatus === 'overdue').length;
  const stripePending  = students.filter(s => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending').length;

  const monthlyFeesTotal = students
    .filter(s => s.stripePaymentStatus === 'active')
    .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  // ── Relatório por período ──────────────────────────────────────────────────

  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hojeStr());
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erroRelatorio, setErroRelatorio] = useState<string | null>(null);

  const studentNameMap = Object.fromEntries(students.map(s => [s.id, s.name]));

  const buscarRelatorio = async () => {
    if (!academyId) return;
    setBuscando(true);
    setErroRelatorio(null);
    try {
      const inicioISO = new Date(`${dataInicio}T00:00:00`).toISOString();
      const fimISO = new Date(`${dataFim}T23:59:59`).toISOString();

      const data = await firestoreService.getDocuments<Movimentacao>(
        'payments',
        [
          { field: 'academyId', operator: '==', value: academyId },
          { field: 'paidAt', operator: '>=', value: inicioISO },
          { field: 'paidAt', operator: '<=', value: fimISO },
        ],
        { orderByField: 'paidAt', orderDirection: 'desc' }
      );

      setMovimentacoes(data.map(m => ({ ...m, studentName: studentNameMap[m.studentId] ?? 'Aluno' })));
    } catch (err: any) {
      console.error('Erro ao buscar relatório:', err);
      setErroRelatorio(
        err.message?.includes('index')
          ? 'O Firestore precisa de um índice pra essa consulta. Veja o console do navegador — deve ter um link pra criar automaticamente.'
          : 'Erro ao buscar o relatório'
      );
    } finally {
      setBuscando(false);
    }
  };

  const totalPeriodo = (movimentacoes ?? []).reduce((sum, m) => sum + m.amount, 0);
  const totalManual = (movimentacoes ?? []).filter(m => m.source === 'manual').reduce((sum, m) => sum + m.amount, 0);
  const totalStripe = totalPeriodo - totalManual;

  const exportarCSV = () => {
    if (!movimentacoes || movimentacoes.length === 0) return;

    const headers = ['Data', 'Aluno', 'Descrição', 'Tipo', 'Forma de pagamento', 'Origem', 'Valor'];
    const rows = movimentacoes.map(m => [
      new Date(m.paidAt).toLocaleDateString('pt-BR'),
      m.studentName ?? '',
      m.description ?? '',
      m.type === 'subscription' ? 'Mensalidade' : 'Avulso',
      m.paymentMethod ?? (m.source === 'manual' ? '-' : 'Cartão/Stripe'),
      m.source === 'manual' ? 'Manual' : 'Stripe',
      `R$ ${m.amount.toFixed(2)}`,
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `movimentacoes_${dataInicio}_a_${dataFim}.csv`;
    link.click();
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Cards de resumo financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Assinaturas Ativas</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stripeActive}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrency(monthlyFeesTotal)} / mês estimado
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Em Atraso</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stripeOverdue}</p>
          <p className="text-xs text-gray-400 mt-1">
            {stripeOverdue > 0 ? 'Requerem atenção' : 'Tudo em dia'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pendentes</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stripePending}</p>
          <p className="text-xs text-gray-400 mt-1">Sem assinatura ativa</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total de Alunos</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {students.filter(s => s.status === 'active').length} ativos
          </p>
        </div>
      </div>

      {/* Relatório por período */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            Relatório de movimentações
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Escolha um período pra ver todos os pagamentos recebidos (Stripe + manuais/Pix)
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">De</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Até</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={buscarRelatorio}
              disabled={buscando}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Search className="w-4 h-4" />
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
            {movimentacoes && movimentacoes.length > 0 && (
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
          </div>

          {erroRelatorio && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erroRelatorio}</p>
          )}

          {movimentacoes && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs text-emerald-700 font-medium">Total no período</p>
                  <p className="text-xl font-bold text-emerald-800 mt-1">{formatCurrency(totalPeriodo)}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{movimentacoes.length} movimentação(ões)</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-xs text-indigo-700 font-medium">Via Stripe</p>
                  <p className="text-xl font-bold text-indigo-800 mt-1">{formatCurrency(totalStripe)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-700 font-medium">Manual (dinheiro/Pix)</p>
                  <p className="text-xl font-bold text-amber-800 mt-1">{formatCurrency(totalManual)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Aluno</th>
                      <th className="px-3 py-2 font-medium">Descrição</th>
                      <th className="px-3 py-2 font-medium">Origem</th>
                      <th className="px-3 py-2 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentacoes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                          Nenhuma movimentação nesse período.
                        </td>
                      </tr>
                    ) : (
                      movimentacoes.map(m => (
                        <tr key={m.id}>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {new Date(m.paidAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3 py-2 text-gray-900 font-medium">{m.studentName}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {m.description ?? (m.type === 'subscription' ? 'Mensalidade' : 'Avulso')}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              m.source === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {m.source === 'manual' ? (m.paymentMethod ?? 'Manual') : 'Stripe'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                            {formatCurrency(m.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assinaturas Stripe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Gerenciar Assinaturas</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gerencie planos, gere links de pagamento e cobranças avulsas
          </p>
        </div>
        <div className="p-6">
          <StripeTab />
        </div>
      </div>

    </div>
  );
};