'use client'

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, DollarSign, CheckCircle2, AlertCircle,
  TrendingUp, CreditCard, History, RefreshCw,
  CheckCircle, Clock, Eye, EyeOff, XCircle,
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
  source?: string; // 'manual' = dinheiro/Pix confirmado pelo admin; ausente = veio do Stripe
  paidAt: string;
}

const FUSO = 'America/Sao_Paulo';

// Pagamentos nesses status não entram na receita (estornados, falhos, cancelados...)
const STATUS_NAO_RECEBIDO = ['refunded', 'failed', 'cancelled', 'canceled', 'pending', 'unpaid'];

const foiRecebido = (p: Payment) => !STATUS_NAO_RECEBIDO.includes((p.status ?? '').toLowerCase());

type Situacao = 'active' | 'overdue' | 'cancelled' | 'pending';

// Situação de pagamento do aluno. Quem está "pendente" mas já passou do vencimento é contado
// como em atraso: o status "overdue" só é gravado pelo Stripe, então quem paga por Pix/dinheiro
// nunca apareceria como inadimplente.
function situacaoPagamento(s: Student, inicioDeHoje: number): Situacao {
  const bruto = (s.stripePaymentStatus ?? 'pending') as Situacao;
  if (bruto === 'active' || bruto === 'cancelled' || bruto === 'overdue') return bruto;

  if (s.status === 'active') {
    const venc = (s as any).nextPaymentAt ?? (s as any).nextPaymentDue ?? null;
    if (venc) {
      const t = new Date(venc).getTime();
      if (!Number.isNaN(t) && t < inicioDeHoje) return 'overdue';
    }
  }
  return 'pending';
}

export const DashboardTab: React.FC = () => {
  const { userData } = useAuth();
  const academyId = userData?.academyId;

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [erroPagamentos, setErroPagamentos] = useState(false);
  const [hideValues, setHideValues] = useState(false);

  // "Relógio" que força o recálculo periodicamente. Sem isso, se nada mudar em
  // students/payments na virada do mês (ou do dia), o cálculo continuaria usando
  // o período anterior até algum evento novo disparar o onSnapshot.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000); // checa a cada 1 min
    return () => clearInterval(interval);
  }, []);

  // Muda só quando vira o dia / o mês — são as chaves que refazem as consultas abaixo
  const hojeStr = now.toLocaleDateString('pt-BR', { timeZone: FUSO });
  const mesChave = `${now.getFullYear()}-${now.getMonth()}`;

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

  // Pagamentos — em tempo real. Lê só desde o início do MÊS ANTERIOR (cobre a receita do mês
  // e a lista de recentes), em vez de baixar todos os pagamentos de todos os tempos.
  useEffect(() => {
    if (!academyId) { setLoadingPayments(false); return; }

    const hoje = new Date();
    const desde = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString();

    setErroPagamentos(false);

    const q = query(
      collection(db, 'payments'),
      where('academyId', '==', academyId),
      where('paidAt', '>=', desde),
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
        // Antes isso era silencioso e a receita aparecia como R$ 0,00. Agora o aviso fica visível.
        console.error('Erro ao carregar pagamentos (índice do Firestore ou permissão?):', err);
        setErroPagamentos(true);
        setLoadingPayments(false);
      }
    );

    return () => unsubscribe();
  }, [academyId, mesChave]);

  // Presenças de hoje — em tempo real. Refaz a consulta quando o dia vira.
  useEffect(() => {
    if (!academyId) { setTodayAttendance(0); return; }

    const q = query(
      collection(db, 'attendance'),
      where('academyId', '==', academyId),
      where('date', '==', hojeStr)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => setTodayAttendance(snap.size),
      (err) => console.warn('Attendance não disponível:', err)
    );

    return () => unsubscribe();
  }, [academyId, hojeStr]);

  // Estatísticas derivadas — recalculadas automaticamente sempre que
  // students/payments mudarem (não precisa de nenhum "refresh" manual)
  const stats = useMemo(() => {
    const inicioDeHoje = new Date(now);
    inicioDeHoje.setHours(0, 0, 0, 0);

    const situacoes = students.map(s => situacaoPagamento(s, inicioDeHoje.getTime()));
    const contar = (alvo: Situacao) => situacoes.filter(x => x === alvo).length;

    const inicioDoMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const doMes = payments.filter(p => foiRecebido(p) && new Date(p.paidAt) >= inicioDoMes);
    const soma = (lista: Payment[]) => lista.reduce((sum, p) => sum + p.amount, 0);

    const monthlyRevenue = soma(doMes);
    const monthlyManual = soma(doMes.filter(p => p.source === 'manual'));

    return {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'active').length,
      stripeActive: contar('active'),
      stripeOverdue: contar('overdue'),
      stripePending: contar('pending'),
      stripeCancelled: contar('cancelled'),
      monthlyRevenue,
      monthlySubscriptions: soma(doMes.filter(p => p.type === 'subscription')),
      monthlyOneTime: soma(doMes.filter(p => p.type === 'one_time')),
      monthlyManual,
      monthlyStripe: monthlyRevenue - monthlyManual,
    };
  }, [students, payments, now]);

  const recentPayments = useMemo(() => {
    const studentMap = Object.fromEntries(students.map(s => [s.id, s.name]));
    return payments
      .filter(foiRecebido)
      .slice(0, 5)
      .map(p => ({ ...p, studentName: studentMap[p.studentId] ?? 'Aluno' }));
  }, [payments, students]);

  const formatCurrency = (v: number) =>
    hideValues
      ? '••••••'
      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const maskNumber = (v: number) => hideValues ? '••' : String(v);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const ms = Math.max(0, now.getTime() - d.getTime()); // evita "-3min atrás" por diferença de relógio
    const mins  = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days  = Math.floor(ms / 86400000);
    if (mins  < 1)  return 'agora';
    if (mins  < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days  === 1) return 'Ontem';
    if (days  < 7)  return `${days} dias atrás`;
    return d.toLocaleDateString('pt-BR');
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

  const linhasStatus = [
    { label: 'Em dia',    value: stats.stripeActive,    color: 'bg-emerald-500', icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, textColor: 'text-emerald-700' },
    { label: 'Em atraso', value: stats.stripeOverdue,   color: 'bg-red-500',     icon: <AlertCircle className="w-4 h-4 text-red-600" />,     textColor: 'text-red-700' },
    { label: 'Pendente',  value: stats.stripePending,   color: 'bg-amber-400',   icon: <Clock className="w-4 h-4 text-amber-600" />,          textColor: 'text-amber-700' },
    // Só aparece quando existe alguém cancelado — sem isso as barras não fechavam 100%
    ...(stats.stripeCancelled > 0
      ? [{ label: 'Cancelado', value: stats.stripeCancelled, color: 'bg-gray-400', icon: <XCircle className="w-4 h-4 text-gray-500" />, textColor: 'text-gray-600' }]
      : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

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

      {erroPagamentos && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 sm:p-4 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Não foi possível carregar os pagamentos, então a receita e a lista de recentes podem estar
            incompletas. Se o problema continuar, abra o console do navegador (F12): o Firestore mostra
            um link para criar o índice que falta.
          </p>
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-gray-500">Total de Alunos</span>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{maskNumber(stats.totalStudents)}</p>
          <p className="text-xs text-gray-400 mt-1">{maskNumber(stats.activeStudents)} ativos</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-gray-500">Receita do Mês</span>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 break-words">{formatCurrency(stats.monthlyRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Stripe + manual</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-gray-500">Presenças Hoje</span>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{maskNumber(todayAttendance)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {hideValues ? '••%' : `${Math.min(100, pct(todayAttendance, stats.activeStudents))}% dos ativos`}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-gray-500">Inadimplentes</span>
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{maskNumber(stats.stripeOverdue)}</p>
          <p className="text-xs text-gray-400 mt-1">pagamentos em atraso</p>
        </div>
      </div>

      {/* Status das assinaturas + Receita */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-red-600" />
            Status dos Pagamentos
          </h3>
          <div className="space-y-4">
            {linhasStatus.map(row => (
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

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            Receita do Mês
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between gap-2 mb-1.5">
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
              <div className="flex justify-between gap-2 mb-1.5">
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

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
                <p className="text-xs text-indigo-700">Via Stripe</p>
                <p className="text-sm font-semibold text-indigo-800 mt-0.5 break-words">
                  {formatCurrency(stats.monthlyStripe)}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                <p className="text-xs text-amber-700">Manual (dinheiro/Pix)</p>
                <p className="text-sm font-semibold text-amber-800 mt-0.5 break-words">
                  {formatCurrency(stats.monthlyManual)}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-gray-900">Total do mês</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600">
                  {formatCurrency(stats.monthlyRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagamentos recentes */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
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
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.studentName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.type === 'subscription' ? 'Mensalidade' : p.description ?? 'Cobrança avulsa'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
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