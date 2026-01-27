// components/invoices/InvoiceForm.tsx

'use client'

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Student, Invoice, CreateInvoiceData, UpdateInvoiceData } from '@/types';
import { Button } from '@/components/common/Button';

interface InvoiceFormProps {
  students: Student[];
  invoice?: Invoice;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData | UpdateInvoiceData) => Promise<void>;
}

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  students,
  invoice,
  onClose,
  onSubmit
}) => {
  const isEdit = !!invoice;
  const currentDate = new Date();
  
  const [studentId, setStudentId] = useState(invoice?.studentId || '');
  const [month, setMonth] = useState(invoice?.month || (currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(invoice?.year || currentDate.getFullYear());
  const [amount, setAmount] = useState(invoice?.amount.toString() || '');
  const [dueDay, setDueDay] = useState(
    invoice?.dueDate ? invoice.dueDate.split('/')[0] : '10'
  );
  const [description, setDescription] = useState(invoice?.description || '');
  const [pixKey, setPixKey] = useState(invoice?.pixKey || '');
  const [loading, setLoading] = useState(false);

  // Auto-preencher valor quando selecionar aluno
  useEffect(() => {
    if (!isEdit && studentId) {
      const student = students.find(s => s.id === studentId);
      if (student?.monthlyFee) {
        setAmount(student.monthlyFee.toString());
      }
    }
  }, [studentId, students, isEdit]);

  // Auto-preencher descrição
  useEffect(() => {
    if (!isEdit) {
      const monthName = MONTHS.find(m => m.value === month)?.label || '';
      setDescription(`Mensalidade - ${monthName}/${year}`);
    }
  }, [month, year, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor, informe um valor válido');
      return;
    }

    if (!isEdit && !studentId) {
      alert('Por favor, selecione um aluno');
      return;
    }

    setLoading(true);

    try {
      const dueDate = `${dueDay.padStart(2, '0')}/${month}/${year}`;

      if (isEdit) {
        await onSubmit({
          amount: parseFloat(amount),
          dueDate,
          description: description || undefined,
          pixKey: pixKey || undefined,
        } as UpdateInvoiceData);
      } else {
        const selectedStudent = students.find(s => s.id === studentId);
        if (!selectedStudent) {
          alert('Aluno não encontrado');
          return;
        }

        await onSubmit({
          studentId,
          studentName: selectedStudent.name,
          month,
          year,
          amount: parseFloat(amount),
          dueDate,
          description: description || undefined,
          pixKey: pixKey || undefined,
        } as CreateInvoiceData);
      }
    } catch (error) {
      console.error('Erro ao salvar fatura:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Editar Fatura' : 'Nova Fatura'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aluno *
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um aluno</option>
                {students
                  .filter(s => s.status === 'active')
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} {student.monthlyFee ? `- R$ ${student.monthlyFee.toFixed(2)}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês *
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
                disabled={isEdit}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano *
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min={2020}
                max={2050}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                placeholder="150.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia do Vencimento *
              </label>
              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                min="1"
                max="31"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Vencimento: {dueDay.padStart(2, '0')}/{month}/{year}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mensalidade - Janeiro/2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chave PIX (opcional)
            </label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="email@exemplo.com, telefone ou chave aleatória"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Fatura'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};