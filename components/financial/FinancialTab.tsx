'use client'

import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { StripeTab } from './StripeTab';
import { useStudents } from '@/hooks/useStudents';
import { formatCurrency } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const FinancialTab: React.FC = () => {
  const { students, loading } = useStudents();

  const stripeActive   = students.filter(s => s.stripePaymentStatus === 'active').length;
  const stripeOverdue  = students.filter(s => s.stripePaymentStatus === 'overdue').length;
  const stripePending  = students.filter(s => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending').length;

  const monthlyFeesTotal = students
    .filter(s => s.stripePaymentStatus === 'active')
    .reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Cards de resumo financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Assinaturas Ativas</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stripeActive}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatCurrency(monthlyFeesTotal)} / mês estimado
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Em Atraso</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stripeOverdue}</p>
          <p className="text-xs text-gray-400 mt-1">
            {stripeOverdue > 0 ? 'Requerem atenção' : 'Tudo em dia'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Pendentes</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stripePending}</p>
          <p className="text-xs text-gray-400 mt-1">Sem assinatura ativa</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total de Alunos</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {students.filter(s => s.status === 'active').length} ativos
          </p>
        </div>
      </div>

      {/* Assinaturas Stripe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Gerenciar Assinaturas</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gerencie planos, gere links de pagamento e cobranças avulsas
          </p>
        </div>
        <div className="p-6">
          <StripeTab />
        </div>
      </div>

    </div>
  );
};