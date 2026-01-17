'use client'

import { useState, useCallback, useEffect } from 'react';
import { Transaction, TransactionType } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useToast } from './useToast';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Carregar transações
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await firestoreService.getDocuments<Transaction>('transactions', {
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
      
      setTransactions(data);
      return data;
    } catch (err: any) {
      const errorMsg = 'Erro ao carregar transações';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Adicionar transação
  const addTransaction = useCallback(async (transactionData: Partial<Transaction>) => {
    try {
      setLoading(true);
      setError(null);

      if (!transactionData.amount || transactionData.amount <= 0) {
        throw new Error('Valor deve ser maior que zero');
      }

      if (!transactionData.description) {
        throw new Error('Descrição é obrigatória');
      }

      const now = new Date().toISOString();
      const newTransactionData: Omit<Transaction, 'id'> = {
        type: transactionData.type || 'revenue',
        amount: transactionData.amount,
        description: transactionData.description.trim(),
        category: transactionData.category?.trim() || 'Outros',
        paymentMethod: transactionData.paymentMethod,
        studentId: transactionData.studentId,
        studentName: transactionData.studentName,
        createdAt: now,
        updatedAt: now
      };

      const newTransaction = await firestoreService.addDocument<Transaction>('transactions', newTransactionData);
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Se for uma receita vinculada a aluno, atualizar status de pagamento
      if (newTransaction.type === 'revenue' && newTransaction.studentId) {
        // Aqui você pode implementar a lógica para atualizar o status do aluno
        // Por exemplo, marcar como pago e atualizar data do próximo vencimento
      }
      
      showToast('Transação registrada com sucesso!', 'success');
      return newTransaction;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao registrar transação';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Excluir transação
  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await firestoreService.deleteDocument('transactions', id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      showToast('Transação excluída com sucesso', 'info');
    } catch (err: any) {
      const errorMsg = 'Erro ao excluir transação';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Calcular estatísticas do mês
  const getMonthlyStats = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const revenue = monthlyTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const profit = revenue - expenses;

    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === lastMonth.getMonth() && tDate.getFullYear() === lastMonth.getFullYear();
    });

    const lastMonthRevenue = lastMonthTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const revenueGrowth = lastMonthRevenue > 0 
      ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      revenue,
      expenses,
      profit,
      revenueGrowth,
      transactionCount: monthlyTransactions.length
    };
  }, [transactions]);

  // Filtrar transações por tipo
  const getTransactionsByType = useCallback((type: TransactionType): Transaction[] => {
    return transactions.filter(t => t.type === type);
  }, [transactions]);

  // Filtrar transações por mês
  const getTransactionsByMonth = useCallback((year: number, month: number): Transaction[] => {
    return transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }, [transactions]);

  // Carregar dados inicialmente
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    loadTransactions,
    addTransaction,
    deleteTransaction,
    getMonthlyStats,
    getTransactionsByType,
    getTransactionsByMonth
  };
};