'use client'

import React from 'react';
import { Users, Activity, CheckCircle2, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const StudentView: React.FC = () => {
  const { currentStudent, logout } = useAuth();

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentStudent.name}</h1>
              <p className="text-sm text-gray-600">Faixa {currentStudent.belt}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Status</span>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {currentStudent.status === 'active' ? 'Ativo' : 'Inativo'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Presenças</span>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {currentStudent.totalAttendances}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Próximo Vencimento</span>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {/* Aqui você pode formatar a data */}
              {new Date(currentStudent.nextPaymentDue).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Conteúdo para o aluno */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Meu Painel</h2>
          <p className="text-gray-600">
            Bem-vindo ao seu painel! Aqui você pode acompanhar suas presenças, pagamentos e acessar conteúdos.
          </p>
        </div>
      </main>
    </div>
  );
};