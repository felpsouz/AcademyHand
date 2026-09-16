'use client'

import { useState, useCallback, useEffect } from 'react';
import { Transaction, TransactionType } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useToast } from './useToast';
import { useAuth } from '@/contexts/AuthContext';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { userData } = useAuth();
  const academyId = userData?.academyId;

  // Carregar transações (sempre filtrado pela academia do usuário logado)
  const loadTransactions = useCallback(async () => {
    if (!academyId) {
      setTransactions([]);
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await firestoreService.getDocuments<Transaction>(
        'transactions',
        { field: 'academyId', operator: '==', value: academyId },
        { orderByField: 'createdAt', orderDirection: 'desc' }
      );
      
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
  }, [academyId, showToast]);

  // Adicionar transação
  const addTransaction = useCallback(async (transactionData: Partial<Transaction>) => {
    if (!academyId) {
      throw new Error('Academia não identificada. Faça login novamente.');
    }

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
      
      const newTransactionData: any = {
        academyId,
        type: transactionData.type || 'revenue',
        amount: transactionData.amount,
        description: transactionData.description.trim(),
        category: transactionData.category?.trim() || 'Outros',
        createdAt: now,
        updatedAt: now
      };

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
  }, [academyId, showToast]);

  // Atualizar transação
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      setLoading(true);
      setError(null);

      const updatedData: any = {
        updatedAt: new Date().toISOString()
      };

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
      
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Transação excluída com sucesso', 'info');
    } catch (err: any) {
      const errorMsg = 'Erro ao excluir transação';
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

  const getTransactionsByType = useCallback((type: TransactionType): Transaction[] => {
    return transactions.filter(t => t.type === type);
  }, [transactions]);

  const getTransactionsByMonth = useCallback((year: number, month: number): Transaction[] => {
    return transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });
  }, [transactions]);

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