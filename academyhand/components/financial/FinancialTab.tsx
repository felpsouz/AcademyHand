'use client'

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Plus } from 'lucide-react';
import { Transaction } from '@/types';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/formatters';

export const FinancialTab: React.FC = () => {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Mock data temporário
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'revenue',
      amount: 200,
      description: 'Mensalidade - João Silva',
      category: 'Mensalidade',
      paymentMethod: 'cash',
      studentId: '1',
      studentName: 'João Silva',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'expense',
      amount: 500,
      description: 'Compra de kimonos',
      category: 'Equipamento',
      paymentMethod: 'transfer',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      type: 'revenue',
      amount: 200,
      description: 'Mensalidade - Maria Santos',
      category: 'Mensalidade',
      paymentMethod: 'pix',
      studentId: '2',
      studentName: 'Maria Santos',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ]);

  const calculateMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const revenue = monthlyTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const profit = revenue - expenses;

    return { revenue, expenses, profit };
  };

  const stats = calculateMonthlyStats();

  const handleAddTransaction = (transactionData: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ...transactionData as Omit<Transaction, 'id'>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions(prev => [...prev, newTransaction]);
    showToast('Transação registrada!', 'success');
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
    showToast('Transação atualizada!', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast('Transação excluída', 'info');
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      handleDeleteTransaction(id);
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Receita do Mês</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.revenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">+12.5% vs mês anterior</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Despesas do Mês</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.expenses)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Lucro do Mês</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.profit)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Margem: {stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <button 
          onClick={() => {
            setEditingTransaction(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      {/* Lista de Transações */}
      <TransactionList
        transactions={transactions}
        onDelete={handleDelete}
      />

      {/* Modal de Transação */}
      <Modal
        isOpen={showModal}
        onClose={handleFormSuccess}
        title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
        size="md"
      >
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  );
};