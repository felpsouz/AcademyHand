// components/invoices/InvoicesTab.tsx - VERSÃO CORRIGIDA

'use client'

import React, { useState } from 'react';
import { DollarSign, Plus, RefreshCw, Filter } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useStudents } from '@/hooks/useStudents';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { GenerateInvoicesModal } from './GenerateInvoicesModal';
import { Button } from '@/components/common/Button';
import type { InvoiceStatus, Invoice, CreateInvoiceData, UpdateInvoiceData } from '@/types';

export const InvoicesTab: React.FC = () => {
  const { students } = useStudents();
  const {
    invoices,
    loading,
    stats,
    addInvoice,
    updateInvoice,
    markAsPaid,
    markAsUnpaid,
    deleteInvoice,
    generateMonthlyInvoices,
    loadInvoices,
  } = useInvoices();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const filteredInvoices = statusFilter === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === statusFilter);

  const getStatusBadgeClass = (status: InvoiceStatus | 'all') => {
    const base = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
    const active = 'bg-red-600 text-white';
    const inactive = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    
    return statusFilter === status ? `${base} ${active}` : `${base} ${inactive}`;
  };

  // Handlers com tipos corretos
  const handleAddInvoice = async (data: CreateInvoiceData | UpdateInvoiceData) => {
    await addInvoice(data as CreateInvoiceData);
    setIsFormOpen(false);
  };

  const handleEditInvoice = async (data: CreateInvoiceData | UpdateInvoiceData) => {
    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, data as UpdateInvoiceData);
      setEditingInvoice(null);
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando faturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total de Faturas</span>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.formattedTotalAmount}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Pagas</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.formattedPaidAmount}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Pendentes</span>
            <DollarSign className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Atrasadas</span>
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.formattedPendingAmount} pendente</p>
        </div>
      </div>

      {/* Ações e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          <button
            onClick={() => setStatusFilter('all')}
            className={getStatusBadgeClass('all')}
          >
            Todas ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={getStatusBadgeClass('pending')}
          >
            Pendentes ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={getStatusBadgeClass('paid')}
          >
            Pagas ({stats.paid})
          </button>
          <button
            onClick={() => setStatusFilter('overdue')}
            className={getStatusBadgeClass('overdue')}
          >
            Atrasadas ({stats.overdue})
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadInvoices}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Gerar Faturas do Mês
          </button>
          
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Nova Fatura
          </Button>
        </div>
      </div>

      {/* Lista de Faturas */}
      <InvoiceList
        invoices={filteredInvoices}
        onMarkAsPaid={markAsPaid}
        onMarkAsUnpaid={markAsUnpaid}
        onEdit={(invoice) => {
          setEditingInvoice(invoice);
        }}
        onDelete={deleteInvoice}
        loading={loading}
      />

      {/* Modal de Nova Fatura */}
      {isFormOpen && (
        <InvoiceForm
          students={students}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleAddInvoice}
        />
      )}

      {/* Modal de Edição */}
      {editingInvoice && (
        <InvoiceForm
          students={students}
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSubmit={handleEditInvoice}
        />
      )}

      {/* Modal de Geração em Lote */}
      {isGenerateModalOpen && (
        <GenerateInvoicesModal
          students={students.filter(s => s.status === 'active' && s.monthlyFee > 0)}
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={generateMonthlyInvoices}
        />
      )}
    </div>
  );
};