'use client'

import React, { useState, useMemo } from 'react';
import { Search, Plus, Download } from 'lucide-react';
import { Student } from '@/types';
import { StudentForm } from './StudentForm';
import { StudentList } from './StudentList';
import { Modal } from '@/components/common/Modal';
import { useStudents } from '@/hooks/useStudents';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'] as const;
const ITEMS_PER_PAGE = 10;

// ─── helpers (fonte única de verdade, espelhando StudentList) ─────────────────

function getEffectiveStatus(student: Student): string {
  const manualUntil  = (student as any).manualPaymentUntil;
  const manualActive =
    (student as any).manualPayment === true &&
    manualUntil &&
    new Date(manualUntil) > new Date();

  return manualActive
    ? 'active'
    : (student.stripePaymentStatus ?? student.paymentStatus ?? 'pending');
}

// ─── componente ──────────────────────────────────────────────────────────────

export const StudentsTab: React.FC = () => {
  const { students, loading, addStudent, updateStudent, deleteStudent } = useStudents();

  // filtros
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterBelt,   setFilterBelt]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // paginação
  const [currentPage, setCurrentPage] = useState(1);

  // modal de criação/edição
  const [showModal,       setShowModal]       = useState(false);
  const [editingStudent,  setEditingStudent]  = useState<Student | null>(null);

  // ── filtros ─────────────────────────────────────────────────────────────────

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBelt   = filterBelt   === 'all' || s.belt   === filterBelt;
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

      return matchesSearch && matchesBelt && matchesStatus;
    });
  }, [students, searchTerm, filterBelt, filterStatus]);

  // ── paginação ────────────────────────────────────────────────────────────────

  const totalPages    = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const safePage      = Math.min(currentPage, totalPages);
  const pagedStudents = filteredStudents.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage       * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ── reset de página ao filtrar ───────────────────────────────────────────────

  const updateSearch = (v: string)  => { setSearchTerm(v);   setCurrentPage(1); };
  const updateBelt   = (v: string)  => { setFilterBelt(v);   setCurrentPage(1); };
  const updateStatus = (v: string)  => { setFilterStatus(v); setCurrentPage(1); };

  // ── handlers de StudentList ──────────────────────────────────────────────────

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      await deleteStudent(id);
    }
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  // ── exportação CSV ───────────────────────────────────────────────────────────

  const handleExport = () => {
    const statusLabel: Record<string, string> = {
      active: 'Em dia', paid: 'Pago', overdue: 'Atrasado',
      pending: 'Pendente', cancelled: 'Cancelado',
    };

    const headers = ['Nome', 'Email', 'Faixa', 'Status', 'Pagamento', 'Plano', 'Mensalidade', 'Presenças'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email,
      s.belt ?? '',
      s.status === 'active' ? 'Ativo' : s.status === 'inactive' ? 'Inativo' : 'Suspenso',
      statusLabel[getEffectiveStatus(s)] ?? 'Pendente',
      s.plano ? `${s.plano} · ${s.periodicidade}` : '-',
      `R$ ${s.monthlyFee?.toFixed(2) ?? '0.00'}`,
      String(s.totalAttendances ?? 0),
    ]);

    const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = `alunos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ── estatísticas ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       students.length,
    active:      students.filter(s => s.status === 'active').length,
    paid:        students.filter(s => getEffectiveStatus(s) === 'active').length,
    overdue:     students.filter(s => getEffectiveStatus(s) === 'overdue').length,
  }), [students]);

  // ── loading ──────────────────────────────────────────────────────────────────

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Filtros e ações */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">

          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alunos..."
                value={searchTerm}
                onChange={e => updateSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            <select
              value={filterBelt}
              onChange={e => updateBelt(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">Todas as Faixas</option>
              {BELTS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={e => updateStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button
              onClick={handleExport}
              disabled={filteredStudents.length === 0}
              className="flex-1 lg:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => { setEditingStudent(null); setShowModal(true); }}
              className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Aluno
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Alunos',  value: stats.total,   color: 'text-gray-900'   },
          { label: 'Alunos Ativos',    value: stats.active,  color: 'text-green-600'  },
          { label: 'Em dia',           value: stats.paid,    color: 'text-indigo-600' },
          { label: 'Inadimplentes',    value: stats.overdue, color: 'text-red-600'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Delegamos tabela + paginação + pagamento manual ao StudentList */}
      <StudentList
        students={pagedStudents}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Modal de criação / edição */}
      <Modal
        isOpen={showModal}
        onClose={handleFormSuccess}
        title={editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
        size="lg"
      >
        <StudentForm student={editingStudent} onSuccess={handleFormSuccess} />
      </Modal>
    </div>
  );
};