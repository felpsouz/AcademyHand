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
      
      // Criar objeto base
      const newTransactionData: any = {
        type: transactionData.type || 'revenue',
        amount: transactionData.amount,
        description: transactionData.description.trim(),
        category: transactionData.category?.trim() || 'Outros',
        createdAt: now,
        updatedAt: now
      };

      // Adicionar campos opcionais somente se tiverem valor
      if (transactionData.paymentMethod) {
        newTransactionData.paymentMethod = transactionData.paymentMethod;
      }

      if (transactionData.studentId?.trim()) {
        newTransactionData.studentId = transactionData.studentId.trim();
      }

      if (transactionData.studentName?.trim()) {
        newTransactionData.studentName = transactionData.studentName.trim();
      }

      if (transactionData.notes?.trim()) {
        newTransactionData.notes = transactionData.notes.trim();
      }

      const newTransaction = await firestoreService.addDocument<Transaction>('transactions', newTransactionData);
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setTransactions(prev => [newTransaction, ...prev]);
      
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

  // Atualizar transação
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      setLoading(true);
      setError(null);

      // Criar objeto de atualização sem undefined
      const updatedData: any = {
        updatedAt: new Date().toISOString()
      };

      // Adicionar campos que têm valor
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined) {
          if (typeof value === 'string') {
            if (value.trim()) {
              updatedData[key] = value.trim();
            }
          } else {
            updatedData[key] = value;
          }
        }
      });

      await firestoreService.updateDocument('transactions', id, updatedData);
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, ...updatedData } : t
      ));
      
      showToast('Transação atualizada com sucesso!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar transação';
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
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
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

    // Calcular mês anterior para comparação
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === lastMonth.getMonth() && 
             tDate.getFullYear() === lastMonth.getFullYear();
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
    updateTransaction,
    deleteTransaction,
    getMonthlyStats,
    getTransactionsByType,
    getTransactionsByMonth
  };
};