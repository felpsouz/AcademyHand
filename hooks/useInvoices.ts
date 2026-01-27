// hooks/useInvoices.ts

'use client'

import { useState, useCallback, useEffect } from 'react';
import { Invoice, CreateInvoiceData, UpdateInvoiceData, InvoiceStatus, InvoicePaymentMethod } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useToast } from './useToast';

const MONTHS = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

export const useInvoices = (studentId?: string) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Função helper para atualizar dashboard
  const refreshDashboard = () => {
    if (typeof window !== 'undefined' && (window as any).refreshDashboard) {
      (window as any).refreshDashboard();
    }
  };

  // Carregar faturas
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: Invoice[];
      
      if (studentId) {
        // Carregar faturas de um aluno específico
        data = await firestoreService.getDocuments<Invoice>('invoices', {
          field: 'studentId',
          operator: '==',
          value: studentId,
          orderByField: 'year',
          orderDirection: 'desc'
        });
      } else {
        // Carregar todas as faturas
        data = await firestoreService.getDocuments<Invoice>('invoices', {
          orderByField: 'year',
          orderDirection: 'desc'
        });
      }

      // Atualizar status de faturas atrasadas
      const today = new Date();
      const todayStr = today.toLocaleDateString('pt-BR');
      
      const updatedInvoices = await Promise.all(data.map(async (invoice) => {
        if (invoice.status === 'pending') {
          const [dueDay, dueMonth, dueYear] = invoice.dueDate.split('/').map(Number);
          const dueDate = new Date(dueYear, dueMonth - 1, dueDay);
          
          if (dueDate < today) {
            // Atualizar status para overdue
            await firestoreService.updateDocument('invoices', invoice.id, {
              status: 'overdue' as InvoiceStatus,
              updatedAt: new Date().toISOString()
            });
            return { ...invoice, status: 'overdue' as InvoiceStatus };
          }
        }
        return invoice;
      }));

      setInvoices(updatedInvoices);
      return updatedInvoices;
    } catch (err: any) {
      const errorMsg = 'Erro ao carregar faturas';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [studentId, showToast]);

  // Adicionar fatura
  const addInvoice = useCallback(async (data: CreateInvoiceData) => {
    try {
      setLoading(true);
      setError(null);

      if (!data.studentId || !data.amount || !data.dueDate) {
        throw new Error('Dados obrigatórios faltando');
      }

      const now = new Date().toISOString();
      
      const invoiceData: any = {
        studentId: data.studentId,
        studentName: data.studentName,
        month: data.month,
        year: data.year,
        amount: data.amount,
        dueDate: data.dueDate,
        status: 'pending' as InvoiceStatus,
        description: data.description || `Mensalidade - ${MONTHS[data.month as keyof typeof MONTHS]}/${data.year}`,
        pixKey: data.pixKey || '',
        createdAt: now,
        updatedAt: now
      };

      const newInvoice = await firestoreService.addDocument<Invoice>('invoices', invoiceData);
      
      setInvoices(prev => [newInvoice, ...prev]);
      refreshDashboard();
      showToast('Fatura criada com sucesso!', 'success');
      return newInvoice;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao criar fatura';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Atualizar fatura
  const updateInvoice = useCallback(async (id: string, updates: UpdateInvoiceData) => {
    try {
      setLoading(true);
      setError(null);

      const updatedData: any = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await firestoreService.updateDocument('invoices', id, updatedData);
      
      setInvoices(prev => prev.map(inv => 
        inv.id === id ? { ...inv, ...updatedData } : inv
      ));
      
      refreshDashboard();
      showToast('Fatura atualizada com sucesso!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar fatura';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Marcar como paga
  const markAsPaid = useCallback(async (id: string, paymentMethod: InvoicePaymentMethod) => {
    try {
      setLoading(true);
      
      const now = new Date();
      const paidAtStr = now.toLocaleDateString('pt-BR');

      await firestoreService.updateDocument('invoices', id, {
        status: 'paid' as InvoiceStatus,
        paidAt: paidAtStr,
        paymentMethod,
        updatedAt: now.toISOString()
      });

      setInvoices(prev => prev.map(inv =>
        inv.id === id
          ? { ...inv, status: 'paid' as InvoiceStatus, paidAt: paidAtStr, paymentMethod }
          : inv
      ));

      refreshDashboard();
      showToast('Fatura marcada como paga!', 'success');
    } catch (err: any) {
      const errorMsg = 'Erro ao marcar fatura como paga';
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Remover pagamento
  const markAsUnpaid = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const invoice = invoices.find(inv => inv.id === id);
      if (!invoice) throw new Error('Fatura não encontrada');

      // Verificar se está atrasada
      const [dueDay, dueMonth, dueYear] = invoice.dueDate.split('/').map(Number);
      const dueDate = new Date(dueYear, dueMonth - 1, dueDay);
      const today = new Date();
      const isOverdue = dueDate < today;

      await firestoreService.updateDocument('invoices', id, {
        status: (isOverdue ? 'overdue' : 'pending') as InvoiceStatus,
        paidAt: null,
        paymentMethod: null,
        updatedAt: new Date().toISOString()
      });

      setInvoices(prev => prev.map(inv =>
        inv.id === id
          ? { ...inv, status: (isOverdue ? 'overdue' : 'pending') as InvoiceStatus, paidAt: undefined, paymentMethod: undefined }
          : inv
      ));

      refreshDashboard();
      showToast('Pagamento removido com sucesso!', 'success');
    } catch (err: any) {
      const errorMsg = 'Erro ao remover pagamento';
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoices, showToast]);

  // Excluir fatura
  const deleteInvoice = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      await firestoreService.deleteDocument('invoices', id);
      
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      refreshDashboard();
      showToast('Fatura removida com sucesso', 'info');
    } catch (err: any) {
      const errorMsg = 'Erro ao remover fatura';
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Gerar faturas mensais para todos os alunos ativos
  const generateMonthlyInvoices = useCallback(async (
    students: Array<{ id: string; name: string; monthlyFee: number }>,
    month: string,
    year: number,
    dueDay: number,
    pixKey?: string
  ) => {
    try {
      setLoading(true);
      
      const dueDate = `${dueDay.toString().padStart(2, '0')}/${month}/${year}`;
      
      const newInvoices = await Promise.all(
        students.map(student =>
          addInvoice({
            studentId: student.id,
            studentName: student.name,
            month,
            year,
            amount: student.monthlyFee,
            dueDate,
            description: `Mensalidade - ${MONTHS[month as keyof typeof MONTHS]}/${year}`,
            pixKey
          })
        )
      );

      await loadInvoices();
      showToast(`${newInvoices.length} faturas geradas com sucesso!`, 'success');
    } catch (err: any) {
      const errorMsg = 'Erro ao gerar faturas';
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addInvoice, loadInvoices, showToast]);

  // Estatísticas
  const stats = useCallback(() => {
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const pending = invoices.filter(inv => inv.status === 'pending').length;
    const overdue = invoices.filter(inv => inv.status === 'overdue').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    return {
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      formattedTotalAmount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalAmount),
      formattedPaidAmount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(paidAmount),
      formattedPendingAmount: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(pendingAmount),
    };
  }, [invoices]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return {
    invoices,
    loading,
    error,
    stats: stats(),
    loadInvoices,
    addInvoice,
    updateInvoice,
    markAsPaid,
    markAsUnpaid,
    deleteInvoice,
    generateMonthlyInvoices,
  };
};