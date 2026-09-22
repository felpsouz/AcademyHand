'use client'

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, DollarSign, CheckCircle2, AlertCircle,
  TrendingUp, CreditCard, History, RefreshCw,
  CheckCircle, Clock, Eye, EyeOff,
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { Student } from '@/types';
import { applyManualPaymentExpiration } from '@/utils/manualPayment';

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  description?: string;
  status: string;
  type: 'subscription' | 'one_time';
  paidAt: string;
}

export const DashboardTab: React.FC = () => {
  const { userData } = useAuth();
  const academyId = userData?.academyId;

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [hideValues, setHideValues] = useState(false);

  // "Relógio" que força o recálculo da receita periodicamente. Sem isso, se
  // nada mudar em students/payments exatamente na virada do mês, o cálculo
  // continuaria usando o mês anterior até algum evento novo disparar o
  // onSnapshot — o que pode nunca acontecer se o dashboard ficar parado.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000); // checa a cada 1 min
    return () => clearInterval(interval);
  }, []);

  // Alunos — em tempo real: qualquer mudança (status, pagamento manual,
  // webhook do Stripe atualizando stripePaymentStatus) aparece na hora.
  useEffect(() => {
    if (!academyId) { setLoadingStudents(false); return; }

    const q = query(collection(db, 'students'), where('academyId', '==', academyId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
        setStudents(applyManualPaymentExpiration(data));
        setLoadingStudents(false);
      },
      (err) => {
        console.error('Erro ao escutar alunos:', err);
        setLoadingStudents(false);
      }
    );

    return () => unsubscribe();
  }, [academyId]);

  // Pagamentos — em tempo real: é aqui que uma cobrança paga pelo Stripe
  // (chegando via webhook, no servidor) aparece sem precisar recarregar a página.
  useEffect(() => {
    if (!academyId) { setLoadingPayments(false); return; }

    const q = query(
      collection(db, 'payments'),
      where('academyId', '==', academyId),
      orderBy('paidAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Payment[];
        setPayments(data);
        setLoadingPayments(false);
      },
      (err) => {
        console.warn('Payments não disponível (verifique se o índice já foi criado):', err);
        setLoadingPayments(false);
      }
    );

    return () => unsubscribe();
  }, [academyId]);

  // Presenças de hoje — também em tempo real
  useEffect(() => {
    if (!academyId) { setTodayAttendance(0); return; }

    const todayStr = new Date().toLocaleDateString('pt-BR');
    const q = query(
      collection(db, 'attendance'),
      where('academyId', '==', academyId),
      where('date', '==', todayStr)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => setTodayAttendance(snap.size),
      (err) => console.warn('Attendance não disponível:', err)
    );

    return () => unsubscribe();
  }, [academyId]);

  // Estatísticas derivadas — recalculadas automaticamente sempre que
  // students/payments mudarem (não precisa de nenhum "refresh" manual)
  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active');
    const stripeActive  = students.filter(s => s.stripePaymentStatus === 'active').length;
    const stripeOverdue = students.filter(s => s.stripePaymentStatus === 'overdue').length;
    const stripePending = students.filter(s => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending').length;

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPayments = payments.filter(p => new Date(p.paidAt) >= firstDayOfMonth);
    const monthlyRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlySubscriptions = monthPayments.filter(p => p.type === 'subscription').reduce((sum, p) => sum + p.amount, 0);
    const monthlyOneTime = monthPayments.filter(p => p.type === 'one_time').reduce((sum, p) => sum + p.amount, 0);

    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      stripeActive,
      stripeOverdue,
      stripePending,
      monthlyRevenue,
      monthlySubscriptions,
      monthlyOneTime,
    };
  }, [students, payments, now]);

  const recentPayments = useMemo(() => {
    const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
    return payments.slice(0, 5).map(p => ({
      ...p,
      studentName: studentMap[p.studentId] ?? 'Aluno',
    }));
  }, [payments, students]);

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

  const loading = loadingStudents || loadingPayments;

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
          <p className="text-3xl font-bold text-gray-900">{maskNumber(todayAttendance)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {hideValues ? '••%' : `${pct(todayAttendance, stats.activeStudents)}% dos ativos`}
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