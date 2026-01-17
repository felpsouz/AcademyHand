'use client'

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '@/types';
import { useToast } from '@/hooks/useToast';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSuccess: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'revenue' as TransactionType,
    amount: '',
    description: '',
    category: '',
    paymentMethod: 'cash' as PaymentMethod,
    studentId: '',
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type || 'revenue',
        amount: transaction.amount?.toString() || '',
        description: transaction.description || '',
        category: transaction.category || '',
        paymentMethod: transaction.paymentMethod || 'cash',
        studentId: transaction.studentId || '',
      });
    }
  }, [transaction]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Valor deve ser maior que zero', 'error');
      return;
    }

    if (!formData.description.trim()) {
      showToast('Descrição é obrigatória', 'error');
      return;
    }

    if (!formData.category.trim()) {
      showToast('Categoria é obrigatória', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category.trim(),
        paymentMethod: formData.paymentMethod,
        studentId: formData.studentId || undefined,
      };

      // Mock save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast(
        transaction ? 'Transação atualizada!' : 'Transação registrada!',
        'success'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast('Erro ao salvar transação', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo *
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          disabled={loading}
        >
          <option value="revenue">Receita</option>
          <option value="expense">Despesa</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valor (R$) *
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="200.00"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição *
        </label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="Ex: Mensalidade de João Silva"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria *
          </label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="Ex: Mensalidade, Equipamento..."
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de Pagamento
          </label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            disabled={loading}
          >
            <option value="cash">Dinheiro</option>
            <option value="credit">Cartão de Crédito</option>
            <option value="debit">Cartão de Débito</option>
            <option value="pix">PIX</option>
            <option value="transfer">Transferência</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : transaction ? 'Atualizar' : 'Registrar'}
        </button>
      </div>
    </form>
  );
};