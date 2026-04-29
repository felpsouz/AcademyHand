'use client'

import React, { useEffect, useState } from 'react';
import {
  Users, DollarSign, CheckCircle2, AlertCircle,
  TrendingUp, CreditCard, History, RefreshCw,
  CheckCircle, Clock, Eye, EyeOff,
} from 'lucide-react';
import { firestoreService } from '@/services/firebase/firestore';
import { Student } from '@/types';

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  description?: string;
  status: string;
  type: 'subscription' | 'one_time';
  paidAt: string;
}

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  stripeActive: number;
  stripeOverdue: number;
  stripePending: number;
  monthlyRevenue: number;
  monthlySubscriptions: number;
  monthlyOneTime: number;
  todayAttendance: number;
}

export const DashboardTab: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    stripeActive: 0,
    stripeOverdue: 0,
    stripePending: 0,
    monthlyRevenue: 0,
    monthlySubscriptions: 0,
    monthlyOneTime: 0,
    todayAttendance: 0,
  });
  const [recentPayments, setRecentPayments] = useState<(Payment & { studentName?: string })[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [hideValues,  setHideValues]  = useState(false);

  useEffect(() => { loadDashboardData(); }, [refreshKey]);

  useEffect(() => {
    (window as any).refreshDashboard = () => setRefreshKey(prev => prev + 1);
    return () => { delete (window as any).refreshDashboard; };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const students      = await firestoreService.getDocuments<Student>('students');
      const activeStudents = students.filter(s => s.status === 'active');
      const stripeActive  = students.filter(s => s.stripePaymentStatus === 'active').length;
      const stripeOverdue = students.filter(s => s.stripePaymentStatus === 'overdue').length;
      const stripePending = students.filter(s => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending').length;

      const now            = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let payments: Payment[] = [];
      try {
        payments = await firestoreService.getDocuments<Payment>('payments', {
          orderByField: 'paidAt',
          orderDirection: 'desc',
        });
      } catch (err) {
        console.warn('Payments não disponível:', err);
      }

      const monthPayments        = payments.filter(p => new Date(p.paidAt) >= firstDayOfMonth);
      const monthlyRevenue       = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const monthlySubscriptions = monthPayments.filter(p => p.type === 'subscription').reduce((sum, p) => sum + p.amount, 0);
      const monthlyOneTime       = monthPayments.filter(p => p.type === 'one_time').reduce((sum, p) => sum + p.amount, 0);

      const todayStr = now.toLocaleDateString('pt-BR');
      let todayCount = 0;
      try {
        const att = await firestoreService.getDocuments<any>('attendance', {
          field: 'date', operator: '==', value: todayStr,
        });
        todayCount = att.length;
      } catch (err) {
        console.warn('Attendance não disponível:', err);
      }

      const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
      const recent = payments.slice(0, 5).map(p => ({
        ...p,
        studentName: studentMap[p.studentId] ?? 'Aluno',
      }));

      setRecentPayments(recent);
      setStats({
        totalStudents: students.length,
        activeStudents: activeStudents.length,
        stripeActive,
        stripeOverdue,
        stripePending,
        monthlyRevenue,
        monthlySubscriptions,
        monthlyOneTime,
        todayAttendance: todayCount,
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) =>
    hideValues
      ? '••••••'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const maskNumber = (v: number) => hideValues ? '••' : String(v);

  const formatTime = (dateStr: string) => {
    const d   = new Date(dateStr);
    const now = new Date();
    const ms  = now.getTime() - d.getTime();
    const mins  = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days  = Math.floor(ms / 86400000);
    if (mins  < 60)  return `${mins}min atrás`;
    if (hours < 24)  return `${hours}h atrás`;
    if (days  === 1) return 'Ontem';
    return `${days} dias atrás`;
  };

  const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
          <span className="text-sm text-gray-500">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header com botão olhinho */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setHideValues(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          {hideValues
            ? <><Eye className="w-4 h-4" /> Mostrar valores</>
            : <><EyeOff className="w-4 h-4" /> Ocultar valores</>
          }
        </button>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Total de Alunos</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{maskNumber(stats.totalStudents)}</p>
          <p className="text-xs text-gray-400 mt-1">{maskNumber(stats.activeStudents)} ativos</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Receita do Mês</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">via Stripe</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Presenças Hoje</span>
            <CheckCircle2 className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{maskNumber(stats.todayAttendance)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {hideValues ? '••%' : `${pct(stats.todayAttendance, stats.activeStudents)}% dos ativos`}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Inadimplentes</span>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{maskNumber(stats.stripeOverdue)}</p>
          <p className="text-xs text-gray-400 mt-1">pagamentos em atraso</p>
        </div>
      </div>

      {/* Status Stripe + Receita */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-red-600" />
            Status das Assinaturas
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Em dia',    value: stats.stripeActive,  color: 'bg-emerald-500', icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, textColor: 'text-emerald-700' },
              { label: 'Em atraso', value: stats.stripeOverdue, color: 'bg-red-500',     icon: <AlertCircle className="w-4 h-4 text-red-600" />,     textColor: 'text-red-700' },
              { label: 'Pendente',  value: stats.stripePending, color: 'bg-amber-400',   icon: <Clock className="w-4 h-4 text-amber-600" />,          textColor: 'text-amber-700' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {row.icon}
                    <span className="text-sm text-gray-600">{row.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${row.textColor}`}>
                    {maskNumber(row.value)} alunos
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`${row.color} h-1.5 rounded-full transition-all`}
                    style={{ width: hideValues ? '0%' : `${pct(row.value, stats.totalStudents)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            Receita do Mês
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gray-600">Mensalidades</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatCurrency(stats.monthlySubscriptions)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: hideValues ? '0%' : `${pct(stats.monthlySubscriptions, stats.monthlyRevenue || 1)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gray-600">Cobranças avulsas</span>
                <span className="text-sm font-semibold text-blue-600">
                  {formatCurrency(stats.monthlyOneTime)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: hideValues ? '0%' : `${pct(stats.monthlyOneTime, stats.monthlyRevenue || 1)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total do mês</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(stats.monthlyRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagamentos recentes */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-red-600" />
          Pagamentos Recentes
        </h3>
        {recentPayments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Nenhum pagamento registrado ainda
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentPayments.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
                    <p className="text-xs text-gray-400">
                      {p.type === 'subscription' ? 'Mensalidade' : p.description ?? 'Cobrança avulsa'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    +{formatCurrency(p.amount)}
                  </p>
                  <p className="text-xs text-gray-400">{formatTime(p.paidAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};