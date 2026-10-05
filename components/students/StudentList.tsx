'use client'

import React, { useState } from 'react';
import { Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { Student } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onMarkAttendance?: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  usaGraduacao?: boolean;
}

const DURATIONS = [
  { label: '1 mês',   months: 1  },
  { label: '3 meses', months: 3  },
  { label: '6 meses', months: 6  },
  { label: '1 ano',   months: 12 },
];

// ─── Helpers compartilhados entre a tabela (desktop) e os cards (mobile) ──────

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-green-100 text-green-800',
  paid:      'bg-green-100 text-green-800',
  overdue:   'bg-red-100 text-red-800',
  pending:   'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const STATUS_TEXT: Record<string, string> = {
  active:    'Em dia',
  paid:      'Pago',
  overdue:   'Atrasado',
  pending:   'Pendente',
  cancelled: 'Cancelado',
};

function resolverPagamento(student: Student) {
  const rawStatus    = student.stripePaymentStatus ?? student.paymentStatus ?? 'pending';
  const manualUntil  = (student as any).manualPaymentUntil;
  const manualActive =
    !!(student as any).manualPayment && !!manualUntil &&
    new Date(manualUntil).getTime() > Date.now();

  const effectiveStatus =
    manualActive || rawStatus === 'active' ? 'active' : rawStatus;

  return { effectiveStatus, manualActive, manualUntil };
}

function classeFaixa(belt?: string): string {
  return belt === 'Branca' ? 'bg-gray-100 text-gray-800' :
         belt === 'Azul'   ? 'bg-blue-100 text-blue-800' :
         belt === 'Roxa'   ? 'bg-purple-100 text-purple-800' :
         belt === 'Marrom' ? 'bg-amber-100 text-amber-800' :
                             'bg-black text-white';
}

const BTN_BASE    = 'inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium border rounded-lg transition-colors';
const BTN_PAGO    = 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
const BTN_EDITAR  = 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100';
const BTN_EXCLUIR = 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100';

// ─── Modal de confirmação de pagamento manual ─────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'Pix' },
  { value: 'cartao',   label: 'Cartão (fora do Stripe)' },
];

const ManualPaymentModal: React.FC<{
  student: Student;
  onClose: () => void;
  onConfirm: (months: number, amount: number, paymentMethod: string) => Promise<void>;
}> = ({ student, onClose, onConfirm }) => {
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [amount, setAmount] = useState(String(student.monthlyFee ?? 0));
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [loading, setLoading] = useState(false);

  const until = new Date();
  until.setMonth(until.getMonth() + selectedMonths);

  // Sugere o valor automaticamente quando muda a duração (mensalidade × meses),
  // mas o admin pode sobrescrever se o valor combinado foi outro
  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    setAmount(String((student.monthlyFee ?? 0) * months));
  };

  const handleConfirm = async () => {
    const valorNumerico = parseFloat(amount.replace(',', '.'));
    if (!valorNumerico || valorNumerico <= 0) {
      alert('Informe um valor válido');
      return;
    }
    setLoading(true);
    await onConfirm(selectedMonths, valorNumerico, paymentMethod);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Confirmar pagamento manual
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Aluno: <strong>{student.name}</strong>
        </p>

        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Válido por quanto tempo?
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {DURATIONS.map(d => (
            <button
              key={d.months}
              onClick={() => handleMonthsChange(d.months)}
              className={`py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                selectedMonths === d.months
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
            Valor recebido (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0,00"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
            Forma de pagamento
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          Status ficará <strong>ativo</strong> até{' '}
          <strong>{until.toLocaleDateString('pt-BR')}</strong>, depois volta para{' '}
          <strong>pendente</strong> automaticamente. Esse valor também entra na receita do mês.
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Linha da tabela (desktop) ────────────────────────────────────────────────

const StudentRow: React.FC<{
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onConfirmPayment: (student: Student) => void;
  usaGraduacao: boolean;
}> = ({ student, onEdit, onDelete, onConfirmPayment, usaGraduacao }) => {
  const { effectiveStatus, manualActive, manualUntil } = resolverPagamento(student);

  return (
    <tr className="hover:bg-gray-50">
      {/* Aluno */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-9 w-9 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 font-semibold text-sm">
              {student.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{student.name}</div>
            <div className="text-sm text-gray-500">{student.email}</div>
          </div>
        </div>
      </td>

      {/* Faixa — só aparece se a academia usa sistema de graduação */}
      {usaGraduacao && (
        <td className="px-4 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${classeFaixa(student.belt)}`}>
            {student.belt || 'Não definida'}
          </span>
        </td>
      )}

      {/* Pagamento */}
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full w-fit ${
              STATUS_COLOR[effectiveStatus] ?? STATUS_COLOR.pending
            }`}>
              {STATUS_TEXT[effectiveStatus] ?? 'Pendente'}
            </span>
            {manualActive && (
              <span className="text-xs text-emerald-600 font-medium">manual</span>
            )}
          </div>
          {student.plano && (
            <span className="text-xs text-gray-400 capitalize">
              {student.plano} · {student.periodicidade}
            </span>
          )}
          {manualActive && manualUntil && (
            <span className="text-xs text-gray-400">
              até {new Date(manualUntil).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </td>

      {/* Mensalidade */}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        R$ {student.monthlyFee?.toFixed(2) || '0.00'}
      </td>

      {/* Presenças */}
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {student.totalAttendances || 0} dias
      </td>

      {/* Ações */}
      <td className="px-4 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onConfirmPayment(student)}
            title="Confirmar pagamento em espécie ou Pix"
            className={`${BTN_BASE} ${BTN_PAGO} py-1.5`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pago
          </button>
          <button
            onClick={() => onEdit(student)}
            title="Editar aluno"
            className={`${BTN_BASE} ${BTN_EDITAR} py-1.5`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            onClick={() => onDelete(student.id)}
            title="Excluir aluno"
            className={`${BTN_BASE} ${BTN_EXCLUIR} py-1.5`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Card (mobile) ────────────────────────────────────────────────────────────

const StudentCard: React.FC<{
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onConfirmPayment: (student: Student) => void;
  usaGraduacao: boolean;
}> = ({ student, onEdit, onDelete, onConfirmPayment, usaGraduacao }) => {
  const { effectiveStatus, manualActive, manualUntil } = resolverPagamento(student);

  return (
    <div className="p-4 space-y-3">
      {/* Aluno + faixa */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-600 font-semibold text-sm">
            {student.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
          <p className="text-xs text-gray-500 truncate">{student.email}</p>
        </div>
        {usaGraduacao && (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${classeFaixa(student.belt)}`}>
            {student.belt || 'Não definida'}
          </span>
        )}
      </div>

      {/* Pagamento, mensalidade e presenças */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className={`px-2 py-1 font-semibold rounded-full ${
            STATUS_COLOR[effectiveStatus] ?? STATUS_COLOR.pending
          }`}>
            {STATUS_TEXT[effectiveStatus] ?? 'Pendente'}
          </span>
          {manualActive && <span className="text-emerald-600 font-medium">manual</span>}
        </span>
        <span>R$ {student.monthlyFee?.toFixed(2) || '0.00'}</span>
        <span>{student.totalAttendances || 0} dias</span>
      </div>

      {(student.plano || (manualActive && manualUntil)) && (
        <p className="text-xs text-gray-400">
          {student.plano && (
            <span className="capitalize">{student.plano} · {student.periodicidade}</span>
          )}
          {student.plano && manualActive && manualUntil && ' · '}
          {manualActive && manualUntil && (
            <span>até {new Date(manualUntil).toLocaleDateString('pt-BR')}</span>
          )}
        </p>
      )}

      {/* Ações */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onConfirmPayment(student)} className={`${BTN_BASE} ${BTN_PAGO} py-2.5`}>
          <CheckCircle2 className="w-4 h-4" />
          Pago
        </button>
        <button onClick={() => onEdit(student)} className={`${BTN_BASE} ${BTN_EDITAR} py-2.5`}>
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
        <button onClick={() => onDelete(student.id)} className={`${BTN_BASE} ${BTN_EXCLUIR} py-2.5`}>
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
      </div>
    </div>
  );
};

// ─── Paginação ────────────────────────────────────────────────────────────────

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex flex-wrap justify-center items-center gap-2">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Anterior
    </button>
    <span className="text-sm text-gray-700">
      Página {currentPage} de {totalPages}
    </span>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Próxima
    </button>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  usaGraduacao = true,
}) => {
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [toast, setToast]                   = useState<string | null>(null);
  const { userData } = useAuth();
  const academyId = userData?.academyId;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirmPayment = async (months: number, amount: number, paymentMethod: string) => {
    if (!paymentStudent || !academyId) return;

    const until = new Date();
    until.setMonth(until.getMonth() + months);

    await firestoreService.updateDocument('students', paymentStudent.id, {
      stripePaymentStatus: 'active',
      manualPayment:       true,
      manualPaymentUntil:  until.toISOString(),
      manualPaymentMonths: months,
      lastPaymentAt:       new Date().toISOString(),
    } as any);

    // Registra o valor recebido como um pagamento de verdade — é isso que
    // faz a receita do dashboard contar mensalidades pagas em dinheiro/Pix,
    // não só as que vieram pelo Stripe.
    await firestoreService.addDocument('payments', {
      academyId,
      studentId: paymentStudent.id,
      amount,
      description: `Mensalidade manual (${months} ${months === 1 ? 'mês' : 'meses'})`,
      status: 'paid',
      type: 'subscription',
      paymentMethod,
      source: 'manual',
      paidAt: new Date().toISOString(),
    } as any);

    setPaymentStudent(null);
    if (typeof window !== 'undefined' && (window as any).refreshDashboard) {
      (window as any).refreshDashboard();
    }
    showToast(
      `Pagamento confirmado para ${paymentStudent.name} por ${months} ${months === 1 ? 'mês' : 'meses'}!`
    );
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum aluno encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-center sm:text-left">
          {toast}
        </div>
      )}

      {/* Modal de pagamento manual */}
      {paymentStudent && (
        <ManualPaymentModal
          student={paymentStudent}
          onClose={() => setPaymentStudent(null)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Mobile: cards */}
      <div className="md:hidden bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-100">
        {students.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            onEdit={onEdit}
            onDelete={onDelete}
            onConfirmPayment={setPaymentStudent}
            usaGraduacao={usaGraduacao}
          />
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                {usaGraduacao && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faixa</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensalidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presenças</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <StudentRow
                  key={student.id}
                  student={student}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onConfirmPayment={setPaymentStudent}
                  usaGraduacao={usaGraduacao}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};