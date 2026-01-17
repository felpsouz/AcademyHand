'use client'

import React, { useState } from 'react';
import { Search, Plus, Download, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { Student } from '@/types';
import { StudentForm } from './StudentForm';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks/useToast';

export const StudentsTab: React.FC = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBelt, setFilterBelt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Mock data temporário
  const [students, setStudents] = useState<Student[]>([
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@email.com',
      belt: 'Branca',
      status: 'active',
      paymentStatus: 'paid',
      monthlyFee: 200,
      lastPayment: new Date().toISOString(),
      nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalAttendances: 12,
      beltHistory: []
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@email.com',
      belt: 'Azul',
      status: 'active',
      paymentStatus: 'paid',
      monthlyFee: 200,
      lastPayment: new Date().toISOString(),
      nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalAttendances: 8,
      beltHistory: []
    }
  ]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBelt = filterBelt === 'all' || student.belt === filterBelt;
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    
    return matchesSearch && matchesBelt && matchesStatus;
  });

  const handleAddStudent = (studentData: Partial<Student>) => {
    const newStudent: Student = {
      id: Date.now().toString(),
      ...studentData as Omit<Student, 'id'>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalAttendances: 0,
      beltHistory: []
    };
    setStudents(prev => [...prev, newStudent]);
    showToast('Aluno adicionado com sucesso!', 'success');
  };

  const handleUpdateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    ));
    showToast('Aluno atualizado com sucesso!', 'success');
  };

  const handleDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast('Aluno removido', 'info');
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este aluno?')) {
      handleDeleteStudent(id);
    }
  };

  const handleMarkAttendance = async (studentId: string) => {
    // Mock de presença
    setStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, totalAttendances: s.totalAttendances + 1 }
        : s
    ));
    showToast('Presença registrada!', 'success');
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Filtros e Ações */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alunos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterBelt}
              onChange={(e) => setFilterBelt(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">Todas as Faixas</option>
              <option value="Branca">Branca</option>
              <option value="Azul">Azul</option>
              <option value="Roxa">Roxa</option>
              <option value="Marrom">Marrom</option>
              <option value="Preta">Preta</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="suspended">Suspenso</option>
            </select>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button className="flex-1 lg:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button 
              onClick={() => {
                setEditingStudent(null);
                setShowModal(true);
              }}
              className="flex-1 lg:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Aluno
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Alunos */}
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
                  Status
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
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-semibold">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.belt === 'Branca' ? 'bg-gray-100 text-gray-800' :
                      student.belt === 'Azul' ? 'bg-blue-100 text-blue-800' :
                      student.belt === 'Roxa' ? 'bg-purple-100 text-purple-800' :
                      student.belt === 'Marrom' ? 'bg-amber-100 text-amber-800' :
                      'bg-black text-white'
                    }`}>
                      {student.belt}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' :
                      student.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {student.status === 'active' ? 'Ativo' : 
                       student.status === 'inactive' ? 'Inativo' : 'Suspenso'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {student.monthlyFee.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.totalAttendances}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleMarkAttendance(student.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Marcar presença"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Aluno */}
      <Modal
        isOpen={showModal}
        onClose={handleFormSuccess}
        title={editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
        size="lg"
      >
        <StudentForm
          student={editingStudent}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  );
};