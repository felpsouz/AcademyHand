// components/invoices/GenerateInvoicesModal.tsx

'use client'

import React, { useState } from 'react';
import { X, Users, DollarSign } from 'lucide-react';
import type { Student } from '@/types';
import { Button } from '@/components/common/Button';

interface GenerateInvoicesModalProps {
  students: Student[];
  onClose: () => void;
  onGenerate: (
    students: Array<{ id: string; name: string; monthlyFee: number }>,
    month: string,
    year: number,
    dueDay: number,
    pixKey?: string
  ) => Promise<void>;
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

export const GenerateInvoicesModal: React.FC<GenerateInvoicesModalProps> = ({
  students,
  onClose,
  onGenerate
}) => {
  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));
  const [year, setYear] = useState(currentDate.getFullYear());
  const [dueDay, setDueDay] = useState('10');
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);

  const eligibleStudents = students.filter(s => s.monthlyFee && s.monthlyFee > 0);
  const totalAmount = eligibleStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  const handleGenerate = async () => {
    if (eligibleStudents.length === 0) {
      alert('Nenhum aluno elegível encontrado (alunos ativos com mensalidade cadastrada)');
      return;
    }

    if (!confirm(
      `Confirma a geração de ${eligibleStudents.length} faturas para ${MONTHS.find(m => m.value === month)?.label}/${year}?`
    )) {
      return;
    }

    setLoading(true);
    try {
      await onGenerate(
        eligibleStudents.map(s => ({
          id: s.id,
          name: s.name,
          monthlyFee: s.monthlyFee
        })),
        month,
        year,
        parseInt(dueDay),
        pixKey || undefined
      );
      onClose();
    } catch (error) {
      console.error('Erro ao gerar faturas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Gerar Faturas Mensais
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Alunos Elegíveis</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{eligibleStudents.length}</p>
              <p className="text-xs text-blue-700 mt-1">
                Alunos ativos com mensalidade cadastrada
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Esperado</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totalAmount)}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Soma de todas as mensalidades
              </p>
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mês *
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia do Vencimento *
              </label>
              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                min={1}
                max={31}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                As faturas vencerão em {dueDay.padStart(2, '0')}/{month}/{year}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chave PIX (opcional)
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Sua chave PIX para facilitar pagamentos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Será incluída em todas as faturas geradas
              </p>
            </div>
          </div>

          {/* Lista de alunos */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Faturas que serão geradas:
            </h3>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {eligibleStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhum aluno elegível encontrado
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Aluno</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleStudents.map((student) => (
                      <tr key={student.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(student.monthlyFee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || eligibleStudents.length === 0}
          >
            {loading ? 'Gerando...' : `Gerar ${eligibleStudents.length} Faturas`}
          </Button>
        </div>
      </div>
    </div>
  );
};