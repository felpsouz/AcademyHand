'use client'

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Plus } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { Modal } from '@/components/common/Modal';
import { useTransactions } from '@/hooks/useTransactions';
import { useStudents } from '@/hooks/useStudents';
import { formatCurrency } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const FinancialTab: React.FC = () => {
  const { transactions, loading: loadingTransactions, getMonthlyStats } = useTransactions();
  const { students, loading: loadingStudents } = useStudents();
  const [showModal, setShowModal] = useState(false);

  const stats = getMonthlyStats();

  // Calcular total de mensalidades dos alunos ativos
  const monthlyFeesTotal = students
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  const handleFormSuccess = () => {
    setShowModal(false);
  };

  if ((loadingTransactions || loadingStudents) && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Estatísticas do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 - Receita */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600 truncate">Receita do Mês</span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(stats.revenue)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% vs mês anterior
          </p>
        </div>

        {/* Card 2 - Despesas */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600 truncate">Despesas do Mês</span>
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(stats.expenses)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
            {stats.transactionCount} transações
          </p>
        </div>

        {/* Card 3 - Lucro */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600 truncate">Lucro do Mês</span>
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(stats.profit)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
            Margem: {stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0}%
          </p>
        </div>

        {/* Card 4 - Mensalidades */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600 truncate">Mensalidades Ativas</span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(monthlyFeesTotal)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
            {students.filter(s => s.status === 'active').length} alunos ativos
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      {/* Lista de Transações */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-gray-500">
            Nenhuma transação registrada. Clique em "Nova Transação" para começar.
          </p>
        </div>
      ) : (
        <TransactionList transactions={transactions} />
      )}

      {/* Modal de Transação */}
      <Modal
        isOpen={showModal}
        onClose={handleFormSuccess}
        title="Nova Transação"
        size="md"
      >
        <TransactionForm onSuccess={handleFormSuccess} />
      </Modal>
    </div>
  );
};