'use client'

import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, Video,
  Clock, PlayCircle, History, CheckCircle,
  AlertCircle, CreditCard, ExternalLink,
  TrendingUp, Shield, ChevronRight, Copy, QrCode,
} from 'lucide-react';
import { db } from '@/services/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentDisplayData } from '@/utils/manualPayment';
import { PixQrCode } from '@/components/common/PixQrCode';
import { AgendaAluno } from '@/components/agenda/AgendaAluno';
import { TreinoAluno } from '@/components/treinos/TreinoAluno';

interface StudentViewProps {
  userId: string;
  onLogout: () => void;
}

interface StudentData {
  name: string;
  email: string;
  belt?: string;
  status: string;
  monthlyFee: number;
  dueDate?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentStatus?: 'active' | 'overdue' | 'cancelled' | 'pending';
  plano?: string;
  periodicidade?: string;
  nextPaymentAt?: string;
  lastPaymentAt?: string;
}

// Campos do cadastro novo, lidos direto do documento do aluno
interface PagamentoExtra {
  vezesPorSemana: number | null;
  nextPaymentDue: string | null;
  manualPayment: boolean;
  manualPaymentUntil: string | null;
  stripeSubscriptionId: string | null;
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

// Planos antigos (jiu-jitsu). Só usado quando o aluno não tem "vezes por semana".
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

// ─── helpers de pagamento ─────────────────────────────────────────────────────

function formatarMoeda(valor: number): string {
  return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// Diferença em dias entre hoje e a data (negativo = já passou)
function diasParaData(iso: string): number {
  const alvo = new Date(iso);
  const hoje = new Date();
  alvo.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function textoVencimento(dias: number): string {
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return 'venceu ontem';
  return `venceu há ${Math.abs(dias)} dias`;
}

function rotuloPlano(vezes: number | null, plano?: string): string | null {
  if (vezes) return vezes >= 7 ? 'Livre (todos os dias)' : `${vezes}x por semana`;
  if (plano) return PLAN_LABELS[plano] ?? plano;
  return null;
}

export const StudentView: React.FC<StudentViewProps> = ({ userId, onLogout }) => {
  const { user, userData } = useAuth();
  const academyId = userData?.academyId;

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [extra, setExtra] = useState<PagamentoExtra | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const [pixInfo, setPixInfo] = useState<{ chave?: string; nomeTitular?: string; copiaECola?: string } | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pagamento' | 'attendance' | 'videos'>('overview');

  useEffect(() => {
    if (!userId || !academyId) { setLoading(false); return; }
    loadStudentData();
    loadAttendance();
    loadVideos();
    loadPix();
  }, [userId, academyId]);

  const loadPix = async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/academy/pix', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (res.ok) setPixInfo(data.pix);
    } catch (err) {
      console.error('Erro ao carregar Pix:', err);
    }
  };

  const copiarChavePix = () => {
    if (!pixInfo?.chave) return;
    navigator.clipboard.writeText(pixInfo.chave);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  };

  const loadStudentData = async () => {
    try {
      const studentDoc = await getDoc(doc(db, 'students', userId));
      if (studentDoc.exists()) {
        const dados = studentDoc.data() as any;
        setStudentData(getStudentDisplayData(dados as StudentData));
        setExtra({
          vezesPorSemana: Number(dados.vezesPorSemana) > 0 ? Number(dados.vezesPorSemana) : null,
          nextPaymentDue: dados.nextPaymentDue ?? null,
          manualPayment: dados.manualPayment === true,
          manualPaymentUntil: dados.manualPaymentUntil ?? null,
          stripeSubscriptionId: dados.stripeSubscriptionId ?? null,
        });
      }
    } catch (err) { console.error(err); }
  };

  const loadAttendance = async () => {
    if (!academyId) return;
    try {
      const q = query(
        collection(db, 'attendance'),
        where('academyId', '==', academyId),
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
    if (!academyId) return;
    try {
      const q = query(
        collection(db, 'videos'),
        where('academyId', '==', academyId),
        orderBy('createdAt', 'desc')
      );
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
    if (!studentData?.stripeCustomerId || !academyId || !user) return;
    const idToken = await user.getIdToken();
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ customerId: studentData.stripeCustomerId, academyId }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const assinarAgora = async () => {
    if (!studentData?.plano || !studentData?.periodicidade || !academyId || !user) return;
    setAssinando(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: 'subscription',
          academyId,
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

  // ── situação de pagamento ───────────────────────────────────────────────────

  const stripeStatus = studentData.stripePaymentStatus ?? 'pending';
  const statusInfo = {
    active:    { label: 'Em dia',    color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
    overdue:   { label: 'Em atraso', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200' },
    cancelled: { label: 'Cancelado', color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200' },
    pending:   { label: 'Pendente',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  }[stripeStatus];

  const emDia = stripeStatus === 'active';
  const responsavel = userData?.usaAgenda ? 'o personal' : 'a academia';

  // Pagamento confirmado manualmente (dinheiro / Pix) e ainda dentro da validade
  const manualAtivo =
    !!extra?.manualPayment &&
    !!extra?.manualPaymentUntil &&
    new Date(extra.manualPaymentUntil).getTime() > Date.now();

  // Assinatura de verdade no cartão (Stripe)
  const temStripe =
    !manualAtivo &&
    (stripeStatus === 'active' || stripeStatus === 'overdue') &&
    !!(studentData.stripeCustomerId || extra?.stripeSubscriptionId);

  const podeAssinarNoCartao =
    !temStripe && !manualAtivo && !emDia && !!studentData.plano && !!studentData.periodicidade;

  // Data que importa para o aluno: até quando está pago, ou quando vence
  const vencimentoISO: string | null = manualAtivo
    ? (extra?.manualPaymentUntil ?? null)
    : (studentData.nextPaymentAt ?? extra?.nextPaymentDue ?? null);
  const diasVenc = vencimentoISO ? diasParaData(vencimentoISO) : null;
  const vencidoSemPagar = diasVenc !== null && diasVenc < 0 && !emDia;

  const planoRotulo = rotuloPlano(extra?.vezesPorSemana ?? null, studentData.plano);
  const formaPagamento = manualAtivo
    ? 'Confirmado manualmente'
    : temStripe
      ? 'Assinatura no cartão'
      : null;

  const mostrarPendencia = !emDia && stripeStatus !== 'cancelled';

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
              {studentData.belt && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BELT_COLORS[studentData.belt] ?? 'bg-gray-100 text-gray-600'}`}>
                  Faixa {studentData.belt}
                </span>
              )}
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
              { id: 'attendance', label: 'Treinos',   icon: CheckCircle2 },
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
                {vencimentoISO && (
                  <p className="text-xs text-gray-400 mt-1">
                    {manualAtivo ? 'Pago até' : 'Vencimento'}: {formatarData(vencimentoISO)}
                  </p>
                )}
              </div>
            </div>

            {/* Alerta de pendência ou atraso */}
            {mostrarPendencia && (
              <div
                className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                  stripeStatus === 'overdue' || vencidoSemPagar
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${
                    stripeStatus === 'overdue' || vencidoSemPagar ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {stripeStatus === 'overdue' || vencidoSemPagar ? 'Pagamento em atraso' : 'Pagamento pendente'}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    stripeStatus === 'overdue' || vencidoSemPagar ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {formatarMoeda(studentData.monthlyFee)}
                    {vencimentoISO && diasVenc !== null
                      ? ` · ${textoVencimento(diasVenc)} (${formatarData(vencimentoISO)})`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('pagamento')}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition text-sm font-semibold shadow-sm whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  Como pagar
                </button>
              </div>
            )}
          </div>
        )}

        {/* PAGAMENTO */}
        {activeTab === 'pagamento' && (
          <div className="space-y-4">

            {/* Resumo do plano */}
            <div className={`rounded-2xl border-2 p-5 sm:p-6 ${statusInfo.bg} ${statusInfo.border}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CreditCard className={`w-5 h-5 ${statusInfo.color}`} />
                  <span className="font-semibold text-gray-800">Meu plano</span>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusInfo.color} bg-white border ${statusInfo.border}`}>
                  {statusInfo.label}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                {planoRotulo && (
                  <div>
                    <dt className="text-xs text-gray-500">Plano</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5 capitalize">{planoRotulo}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500">Valor</dt>
                  <dd className="font-semibold text-gray-900 mt-0.5">{formatarMoeda(studentData.monthlyFee)}</dd>
                </div>
                {vencimentoISO && (
                  <div>
                    <dt className="text-xs text-gray-500">{manualAtivo ? 'Pago até' : 'Vencimento'}</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">
                      {formatarData(vencimentoISO)}
                      {diasVenc !== null && (
                        <span className={`block text-xs font-medium ${vencidoSemPagar ? 'text-red-600' : 'text-gray-500'}`}>
                          {textoVencimento(diasVenc)}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {formaPagamento && (
                  <div>
                    <dt className="text-xs text-gray-500">Forma de pagamento</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">{formaPagamento}</dd>
                  </div>
                )}
                {studentData.lastPaymentAt && (
                  <div>
                    <dt className="text-xs text-gray-500">Último pagamento</dt>
                    <dd className="font-semibold text-gray-900 mt-0.5">{formatarData(studentData.lastPaymentAt)}</dd>
                  </div>
                )}
              </dl>

              {stripeStatus === 'overdue' && (
                <div className="mt-5 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Pagamento em atraso — regularize para manter o acesso.
                  </p>
                  {temStripe && (
                    <button
                      onClick={openPortal}
                      className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition font-medium"
                    >
                      Regularizar pagamento
                    </button>
                  )}
                </div>
              )}

              {stripeStatus === 'pending' && (
                <p className="mt-5 pt-4 border-t border-amber-200 text-sm text-amber-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Aguardando pagamento. Veja abaixo como pagar e avise {responsavel} depois.
                </p>
              )}

              {stripeStatus === 'cancelled' && (
                <p className="mt-5 pt-4 border-t border-gray-200 text-sm text-gray-600 font-medium">
                  Seu plano foi cancelado. Fale com {responsavel} para reativar.
                </p>
              )}
            </div>

            {/* Assinatura no cartão (só quem realmente tem) */}
            {temStripe && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-gray-800">Assinatura no cartão</span>
                    </div>
                    {studentData.periodicidade && (
                      <p className="text-sm text-gray-600 capitalize">
                        Cobrança {studentData.periodicidade}
                      </p>
                    )}
                    {studentData.nextPaymentAt && (
                      <p className="text-xs text-gray-500">
                        Próxima cobrança: <strong>{formatarData(studentData.nextPaymentAt)}</strong>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={openPortal}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Gerenciar assinatura
                  </button>
                </div>
              </div>
            )}

            {/* Pagar via Pix */}
            {pixInfo && (pixInfo.chave || pixInfo.copiaECola) && (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-gray-800">Pagar via Pix</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  {pixInfo.copiaECola && (
                    <PixQrCode copiaECola={pixInfo.copiaECola} size={180} />
                  )}

                  <div className="flex-1 w-full space-y-3">
                    <p className="text-sm text-gray-700">
                      Valor: <strong>{formatarMoeda(studentData.monthlyFee)}</strong>
                    </p>
                    {pixInfo.nomeTitular && (
                      <p className="text-sm text-gray-600">
                        Titular: <strong>{pixInfo.nomeTitular}</strong>
                      </p>
                    )}
                    {pixInfo.chave && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Chave Pix</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 break-all">
                            {pixInfo.chave}
                          </code>
                          <button
                            onClick={copiarChavePix}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition flex-shrink-0 ${
                              pixCopiado
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {pixCopiado ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      Depois de pagar, avise {responsavel} para confirmar seu pagamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pagar no cartão (assinatura automática) */}
            {podeAssinarNoCartao && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-gray-800">Pagar no cartão</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Assinatura com cobrança automática, sem precisar lembrar da data.
                    </p>
                  </div>
                  <button
                    onClick={assinarAgora}
                    disabled={assinando}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm shadow-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    <CreditCard className="w-4 h-4" />
                    {assinando ? 'Aguarde...' : 'Assinar agora'}
                  </button>
                </div>
              </div>
            )}

            {/* Como funciona */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Como funciona o pagamento
              </h3>
              <ul className="space-y-2">
                {[
                  `Pague pelo Pix ou combine outra forma com ${responsavel}`,
                  `Depois que ${responsavel} confirmar, seu status muda para "Em dia" até o próximo vencimento`,
                  'Se o vencimento passar sem pagamento, o status fica pendente ou em atraso',
                  ...(temStripe || podeAssinarNoCartao
                    ? ['No cartão, a cobrança é automática e você gerencia pelo portal de assinatura']
                    : []),
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

        {/* TREINOS — treino prescrito + escolha de horários + histórico de presenças */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <TreinoAluno />
            <AgendaAluno />

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