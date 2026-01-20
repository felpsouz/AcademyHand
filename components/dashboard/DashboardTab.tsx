'use client'

import React, { useEffect, useState } from 'react';
import { 
  Users, DollarSign, CheckCircle2, AlertCircle, 
  TrendingUp, CheckCircle, CreditCard, Award, 
  History 
} from 'lucide-react';
import { firestoreService } from '@/services/firebase/firestore';
import { Student, Transaction } from '@/types';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  todayAttendance: number;
  overduePayments: number;
  revenueByCategory: {
    monthly: number;
    products: number;
  };
}

export const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    todayAttendance: 0,
    overduePayments: 0,
    revenueByCategory: {
      monthly: 0,
      products: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Recarregar dados quando houver mudanças
  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]); // ✅ Atualiza quando refreshKey mudar

  // Expor função global para recarregar dashboard
  useEffect(() => {
    (window as any).refreshDashboard = () => {
      setRefreshKey(prev => prev + 1);
    };
    return () => {
      delete (window as any).refreshDashboard;
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar alunos
      const students = await firestoreService.getDocuments<Student>('students');
      
      // Calcular estatísticas de alunos
      const activeStudents = students.filter(s => s.status === 'active');
      const overdueStudents = students.filter(s => s.paymentStatus === 'overdue');

      // Carregar transações do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const transactions = await firestoreService.getDocuments<Transaction>('transactions');
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= firstDayOfMonth;
      });

      // Separar receitas e despesas
      const monthRevenue = monthTransactions.filter(t => t.type === 'revenue');
      const monthExpenses = monthTransactions.filter(t => t.type === 'expense');

      // Calcular receita mensal
      const monthlyRevenue = monthRevenue.reduce((sum, t) => sum + t.amount, 0);
      
      // Calcular despesas mensais
      const monthlyExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

      // DEBUG: Ver as transações e categorias
      console.log('📊 Receitas do mês:', monthRevenue);
      console.log('📉 Despesas do mês:', monthExpenses);
      console.log('💰 Receita total:', monthlyRevenue);
      console.log('💸 Despesa total:', monthlyExpenses);

      // Categorizar receitas - usando match mais flexível
      const revenueByCategory = {
        monthly: monthRevenue
          .filter(t => 
            t.category?.toLowerCase().includes('mensalidade') || 
            t.category?.toLowerCase().includes('monthly') ||
            t.description?.toLowerCase().includes('mensalidade')
          )
          .reduce((sum, t) => sum + t.amount, 0),
        products: monthRevenue
          .filter(t => 
            t.category?.toLowerCase().includes('produto') || 
            t.category?.toLowerCase().includes('product') ||
            t.description?.toLowerCase().includes('produto')
          )
          .reduce((sum, t) => sum + t.amount, 0),
      };

      // Se nenhuma categoria foi identificada, coloca tudo em mensalidades
      if (revenueByCategory.monthly === 0 && 
          revenueByCategory.products === 0 &&
          monthlyRevenue > 0) {
        revenueByCategory.monthly = monthlyRevenue;
      }

      // Atividades recentes (últimas transações)
      const recentTrans = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
        .map(t => ({
          type: t.type,
          name: t.studentName || 'Cliente',
          description: t.description,
          time: formatTime(t.createdAt),
          amount: t.amount,
        }));

      setRecentActivities(recentTrans);

      setStats({
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        inactiveStudents: students.length - activeStudents.length,
        monthlyRevenue,
        monthlyExpenses,
        todayAttendance: 0, // Implementar quando tiver sistema de presença
        overduePayments: overdueStudents.length,
        revenueByCategory,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}min atrás`;
    }
    if (diffHours < 24) {
      return `${diffHours}h atrás`;
    }
    if (diffDays === 1) {
      return 'Ontem';
    }
    return `${diffDays} dias atrás`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const attendancePercentage = stats.activeStudents > 0 
    ? Math.round((stats.todayAttendance / stats.activeStudents) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total de Alunos</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.activeStudents} ativos, {stats.inactiveStudents} inativos
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Receita Mensal</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.monthlyRevenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Este mês</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Presenças Hoje</span>
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayAttendance}</p>
          <p className="text-sm text-gray-500 mt-1">{attendancePercentage}% dos ativos</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Inadimplentes</span>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.overduePayments}</p>
          <p className="text-sm text-gray-500 mt-1">Pagamentos atrasados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600" />
            Atividades Recentes
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {activity.type === 'revenue' ? (
                      <CreditCard className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{activity.name}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${activity.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.type === 'revenue' ? '+' : '-'}{formatCurrency(activity.amount)}
                    </p>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhuma atividade recente</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-red-600" />
            Resumo Financeiro do Mês
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Receitas - Mensalidades</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(stats.revenueByCategory.monthly)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${calculatePercentage(stats.revenueByCategory.monthly, stats.monthlyRevenue + stats.monthlyExpenses)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Receitas - Produtos</span>
                <span className="text-sm font-medium text-green-600">
                  {formatCurrency(stats.revenueByCategory.products)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${calculatePercentage(stats.revenueByCategory.products, stats.monthlyRevenue + stats.monthlyExpenses)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Despesas</span>
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(stats.monthlyExpenses)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ 
                    width: `${calculatePercentage(stats.monthlyExpenses, stats.monthlyRevenue + stats.monthlyExpenses)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Saldo</span>
                <span className={`font-bold ${stats.monthlyRevenue - stats.monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.monthlyRevenue - stats.monthlyExpenses)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};