'use client'

import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, Video,
  Clock, PlayCircle, History, CheckCircle,
  AlertCircle, CreditCard, ExternalLink,
  TrendingUp, Shield, ChevronRight,
} from 'lucide-react';
import { db } from '@/services/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface StudentViewProps {
  userId: string;
  onLogout: () => void;
}

interface StudentData {
  name: string;
  email: string;
  belt: string;
  status: string;
  monthlyFee: number;
  dueDate: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentStatus?: 'active' | 'overdue' | 'cancelled' | 'pending';
  plano?: string;
  periodicidade?: string;
  nextPaymentAt?: string;
  lastPaymentAt?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  confirmed: boolean;
}

interface VideoData {
  id: string;
  title: string;
  duration: string;
  url: string;
  description?: string;
}

const PLAN_LABELS: Record<string, string> = {
  gi:       'Gi (com kimono)',
  nogi:     'No-Gi (sem kimono)',
  completo: 'Gi + No-Gi',
};

const BELT_COLORS: Record<string, string> = {
  Branca: 'bg-gray-100 text-gray-700',
  Azul:   'bg-blue-100 text-blue-700',
  Roxa:   'bg-purple-100 text-purple-700',
  Marrom: 'bg-amber-100 text-amber-700',
  Preta:  'bg-gray-900 text-white',
};

export const StudentView: React.FC<StudentViewProps> = ({ userId, onLogout }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pagamento' | 'attendance' | 'videos'>('overview');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadStudentData();
    loadAttendance();
    loadVideos();
  }, [userId]);

  const loadStudentData = async () => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', userId));
      if (studentDoc.exists()) setStudentData(studentDoc.data() as StudentData);
    } catch (err) { console.error(err); }
  };

  const loadAttendance = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', userId),
        orderBy('date', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AttendanceRecord[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadVideos = async () => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setVideos(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          duration: data.duration
            ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`
            : '00:00',
          url: data.url,
          description: data.description || '',
        };
      }));
    } catch (err) { console.error(err); }
  };

  const openPortal = async () => {
    if (!studentData?.stripeCustomerId) return;
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: studentData.stripeCustomerId }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const assinarAgora = async () => {
    if (!studentData?.plano || !studentData?.periodicidade) return;
    setAssinando(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'subscription',
          studentId: userId,
          studentEmail: studentData.email,
          studentName: studentData.name,
          plano: studentData.plano,
          periodicidade: studentData.periodicidade,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else alert('Erro ao gerar link. Tente novamente.');
    } catch (err) {
      alert('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setAssinando(false);
    }
  };

  const totalThisMonth = attendance.filter(r => {
    const d = new Date(r.date.split('/').reverse().join('-'));
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!userId || !studentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Dados não encontrados</p>
          <button onClick={onLogout} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  const stripeStatus = studentData.stripePaymentStatus;
  const statusInfo = {
    active:    { label: 'Em dia',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
    overdue:   { label: 'Em atraso', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200' },
    cancelled: { label: 'Cancelado', color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200' },
    pending:   { label: 'Pendente',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  }[stripeStatus ?? 'pending'];

  const hasActiveSubscription = stripeStatus === 'active' || stripeStatus === 'overdue';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">{studentData.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{studentData.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BELT_COLORS[studentData.belt] ?? 'bg-gray-100 text-gray-600'}`}>
                Faixa {studentData.belt}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {[
              { id: 'overview',   label: 'Início',    icon: Activity },
              { id: 'pagamento',  label: 'Pagamento', icon: CreditCard },
              { id: 'attendance', label: 'Presenças', icon: CheckCircle2 },
              { id: 'videos',     label: 'Vídeos',    icon: Video },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                  <Activity className={`w-4 h-4 ${studentData.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {studentData.status === 'active' ? 'Ativo' : 'Inativo'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Presenças</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{attendance.length}</p>
                <p className="text-xs text-gray-400 mt-1">Este mês: {totalThisMonth}</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagamento</span>
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                </div>
                <p className={`text-xl font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
                {studentData.nextPaymentAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Próx: {new Date(studentData.nextPaymentAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Alerta de pagamento pendente */}
            {!hasActiveSubscription && studentData.plano && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">Assinatura pendente</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Ative seu plano para ter acesso completo.
                  </p>
                </div>
                <button
                  onClick={assinarAgora}
                  disabled={assinando}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition text-sm font-semibold shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  {assinando ? 'Aguarde...' : 'Assinar agora'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PAGAMENTO */}
        {activeTab === 'pagamento' && (
          <div className="space-y-4">
            {hasActiveSubscription ? (
              <div className={`rounded-2xl border-2 p-6 ${statusInfo.bg} ${statusInfo.border}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${statusInfo.color}`} />
                      <span className="font-semibold text-gray-800">Assinatura Stripe</span>
                    </div>
                    {studentData.plano && (
                      <p className="text-sm text-gray-600 capitalize">
                        {PLAN_LABELS[studentData.plano] ?? studentData.plano} · {studentData.periodicidade}
                      </p>
                    )}
                    {studentData.nextPaymentAt && (
                      <p className="text-xs text-gray-500">
                        Próxima cobrança:{' '}
                        <strong>{new Date(studentData.nextPaymentAt).toLocaleDateString('pt-BR')}</strong>
                      </p>
                    )}
                    {studentData.lastPaymentAt && (
                      <p className="text-xs text-gray-500">
                        Último pagamento:{' '}
                        <strong>{new Date(studentData.lastPaymentAt).toLocaleDateString('pt-BR')}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusInfo.color} ${statusInfo.bg} border ${statusInfo.border}`}>
                      {statusInfo.label}
                    </span>
                    {studentData.stripeCustomerId && (
                      <button
                        onClick={openPortal}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Gerenciar assinatura
                      </button>
                    )}
                  </div>
                </div>

                {stripeStatus === 'overdue' && (
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Pagamento em atraso — regularize para manter o acesso.
                    </p>
                    <button
                      onClick={openPortal}
                      className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition font-medium"
                    >
                      Regularizar pagamento
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl border-2 p-6 ${
                stripeStatus === 'cancelled' ? 'border-gray-200 bg-gray-50' : 'border-amber-300 bg-amber-50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {stripeStatus === 'cancelled' ? 'Assinatura cancelada' : 'Nenhuma assinatura ativa'}
                    </p>
                    {studentData.plano && studentData.periodicidade ? (
                      <p className="text-sm text-gray-600 mt-1">
                        Plano disponível:{' '}
                        <strong className="capitalize">
                          {PLAN_LABELS[studentData.plano] ?? studentData.plano} · {studentData.periodicidade}
                        </strong>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">
                        Entre em contato com a academia para ativar seu plano.
                      </p>
                    )}
                  </div>

                  {studentData.plano && studentData.periodicidade && (
                    <button
                      onClick={assinarAgora}
                      disabled={assinando}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      <CreditCard className="w-4 h-4" />
                      {assinando ? 'Aguarde...' : 'Assinar agora'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Como funciona o pagamento
              </h3>
              <ul className="space-y-2">
                {[
                  'As cobranças são automáticas via Stripe',
                  'Você recebe um email de confirmação a cada pagamento',
                  'Aceita cartão de crédito, débito e boleto',
                  'Cancele ou pause quando quiser pelo portal',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* PRESENÇAS — somente leitura */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-bold text-indigo-600">{attendance.length}</p>
                <p className="text-xs text-gray-500 mt-1">Total de presenças</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-bold text-emerald-600">{totalThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">Este mês</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Histórico</span>
              </div>
              {attendance.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Nenhuma presença registrada</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {attendance.map(record => (
                    <div key={record.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-gray-800">{record.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{record.time}</span>
                        {record.confirmed && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                            Confirmada
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VÍDEOS */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            {videos.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum vídeo disponível</p>
                <p className="text-sm text-gray-400 mt-1">Os vídeos serão adicionados em breve</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map(video => (
                  <div key={video.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow shadow-sm">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{video.title}</h3>
                    {video.description && (
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{video.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {video.duration}
                      </span>
                      <button
                        onClick={() => window.open(video.url, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Assistir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};