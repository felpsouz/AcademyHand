// components/invoices/InvoiceList.tsx

'use client'

import React, { useState } from 'react';
import { Calendar, DollarSign, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import type { Invoice, InvoicePaymentMethod } from '@/types';
import { Button } from '@/components/common/Button';

interface InvoiceListProps {
  invoices: Invoice[];
  onMarkAsPaid: (id: string, method: InvoicePaymentMethod) => Promise<void>;
  onMarkAsUnpaid: (id: string) => Promise<void>;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

const MONTHS = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onMarkAsPaid,
  onMarkAsUnpaid,
  onEdit,
  onDelete,
  loading
}) => {
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
  }>({ isOpen: false, invoiceId: '' });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Vencido',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleMarkAsPaid = async (invoiceId: string, method: InvoicePaymentMethod) => {
    await onMarkAsPaid(invoiceId, method);
    setPaymentModal({ isOpen: false, invoiceId: '' });
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Nenhuma fatura encontrada</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {invoice.studentName}
                  </h3>
                  {getStatusBadge(invoice.status)}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Período:
                    </span>
                    <p className="font-medium text-gray-900">
                      {MONTHS[invoice.month as keyof typeof MONTHS]}/{invoice.year}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Valor:
                    </span>
                    <p className="font-medium text-gray-900 text-lg">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Vencimento:</span>
                    <p className="font-medium text-gray-900">
                      {invoice.dueDate}
                    </p>
                  </div>
                  
                  {invoice.status === 'paid' && invoice.paidAt && (
                    <div>
                      <span className="text-gray-500 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Pagamento:
                      </span>
                      <p className="font-medium text-green-700">
                        {invoice.paidAt}
                      </p>
                    </div>
                  )}
                </div>

                {invoice.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {invoice.description}
                  </p>
                )}

                {invoice.pixKey && invoice.status !== 'paid' && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <span className="text-gray-600 font-medium">Chave PIX: </span>
                    <span className="font-mono text-blue-700">{invoice.pixKey}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invoice.pixKey || '');
                        alert('Chave PIX copiada!');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                {invoice.status === 'overdue' && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                      Esta fatura está <strong>atrasada</strong>. Por favor, regularize o pagamento.
                    </p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-2 ml-4">
                {invoice.status === 'paid' ? (
                  <button
                    onClick={() => {
                      if (confirm('Deseja remover a marcação de pagamento?')) {
                        onMarkAsUnpaid(invoice.id);
                      }
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Remover Pagamento
                  </button>
                ) : (
                  <button
                    onClick={() => setPaymentModal({ isOpen: true, invoiceId: invoice.id })}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Pago
                  </button>
                )}
                
                <button
                  onClick={() => onEdit(invoice)}
                  className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Deseja realmente excluir esta fatura?')) {
                      onDelete(invoice.id);
                    }
                  }}
                  className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Método de Pagamento */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Selecione o método de pagamento
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleMarkAsPaid(paymentModal.invoiceId, 'pix')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">PIX</div>
                <div className="text-sm text-gray-500">Pagamento instantâneo</div>
              </button>
              
              <button
                onClick={() => handleMarkAsPaid(paymentModal.invoiceId, 'credit_card')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">Cartão de Crédito</div>
                <div className="text-sm text-gray-500">Pagamento via cartão</div>
              </button>
              
              <button
                onClick={() => handleMarkAsPaid(paymentModal.invoiceId, 'debit_card')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">Cartão de Débito</div>
                <div className="text-sm text-gray-500">Débito em conta</div>
              </button>
              
              <button
                onClick={() => handleMarkAsPaid(paymentModal.invoiceId, 'cash')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <div className="font-semibold text-gray-900">Dinheiro</div>
                <div className="text-sm text-gray-500">Pagamento em espécie</div>
              </button>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPaymentModal({ isOpen: false, invoiceId: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};