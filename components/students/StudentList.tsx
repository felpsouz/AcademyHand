'use client'

import React from 'react';
import { Student } from '@/types';

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onMarkAttendance: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Componente inline para exibir cada aluno
const StudentRow: React.FC<{
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onMarkAttendance: (id: string) => void;
}> = ({ student, onEdit, onDelete, onMarkAttendance }) => {
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{student.name}</div>
          <div className="text-sm text-gray-500">{student.email}</div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {student.belt || 'Não definida'}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(student.paymentStatus)}`}>
          {getPaymentStatusText(student.paymentStatus)}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        R$ {student.monthlyFee?.toFixed(2) || '0.00'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {student.totalAttendances || 0} dias
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <button
          onClick={() => onMarkAttendance(student.id)}
          className="text-green-600 hover:text-green-900"
        >
          Presença
        </button>
        <button
          onClick={() => onEdit(student)}
          className="text-blue-600 hover:text-blue-900"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(student.id)}
          className="text-red-600 hover:text-red-900"
        >
          Excluir
        </button>
      </td>
    </tr>
  );
};

// Componente de Paginação inline
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex justify-center items-center space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-700">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </div>
  );
};

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onEdit,
  onDelete,
  onMarkAttendance,
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum aluno encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aluno
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Faixa
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status Pagamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensalidade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Presenças
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <StudentRow
                  key={student.id}
                  student={student}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMarkAttendance={onMarkAttendance}
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