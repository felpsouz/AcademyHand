'use client'

import React, { useEffect, useState } from 'react';
import {
  CreditCard, RefreshCw, ExternalLink, CheckCircle,
  AlertCircle, XCircle, Clock, Plus, ChevronDown, ChevronUp,
  Search, Users,
} from 'lucide-react';
import { firestoreService } from '@/services/firebase/firestore';
import { Student, PlanKey, Periodicidade, StripePaymentStatus } from '@/types';
import { PLANS } from '@/lib/plans';
import { CobrancaAvulsaModal } from './CobrancaAvulsaModal';
import { Modal } from '@/components/common/Modal';

const statusConfig: Record<StripePaymentStatus, {
  label: string; bg: string; text: string; border: string; icon: React.ReactNode;
}> = {
  active:    { label: 'Em dia',    bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  overdue:   { label: 'Em atraso', bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     icon: <AlertCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelado', bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-200',    icon: <XCircle className="w-3.5 h-3.5" /> },
  pending:   { label: 'Pendente',  bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: <Clock className="w-3.5 h-3.5" /> },
};

const planColors: Record<PlanKey, string> = {
  gi:       'bg-blue-100 text-blue-700',
  nogi:     'bg-violet-100 text-violet-700',
  completo: 'bg-indigo-100 text-indigo-700',
  kids:     'bg-green-100 text-green-700',
};

const periodicidades: Periodicidade[] = ['mensal', 'trimestral', 'semestral', 'anual'];

export const StripeTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [filter, setFilter] = useState<StripePaymentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [cobrancaStudent, setCobrancaStudent] = useState<Student | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    const data = await firestoreService.getDocuments<Student>('students', {
      orderByField: 'name', orderDirection: 'asc',
    });
    setStudents(data);
    setLoading(false);
  };

  const generateCheckoutLink = async (student: Student, plano: PlanKey, periodicidade: Periodicidade) => {
    setGeneratingLink(`${student.id}-${plano}-${periodicidade}`);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'subscription',
          studentId: student.id,
          studentEmail: student.email,
          studentName: student.name,
          plano,
          periodicidade,
        }),
      });
      const { url } = await res.json();
      if (!url) throw new Error('URL não gerada');
      navigator.clipboard.writeText(url);
      alert(`Link copiado! Envie para ${student.name}`);
    } catch (err) {
      alert('Erro ao gerar link');
    } finally {
      setGeneratingLink(null);
    }
  };

  const openPortal = async (customerId: string) => {
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    const { url } = await res.json();
    window.open(url, '_blank');
  };

  const stats = {
    active:    students.filter(s => s.stripePaymentStatus === 'active').length,
    overdue:   students.filter(s => s.stripePaymentStatus === 'overdue').length,
    cancelled: students.filter(s => s.stripePaymentStatus === 'cancelled').length,
    pending:   students.filter(s => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending').length,
  };

  const filtered = students.filter(s => {
    const matchFilter = filter === 'all' || (s.stripePaymentStatus ?? 'pending') === filter;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-500">Carregando assinaturas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'all',     label: 'Total',     value: students.length, icon: <Users className="w-4 h-4" />,       color: 'bg-gray-50 border-gray-200 text-gray-700' },
          { key: 'active',  label: 'Em dia',    value: stats.active,    icon: <CheckCircle className="w-4 h-4" />, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { key: 'overdue', label: 'Em atraso', value: stats.overdue,   icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-50 border-red-200 text-red-700' },
          { key: 'pending', label: 'Pendente',  value: stats.pending,   icon: <Clock className="w-4 h-4" />,       color: 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map(card => (
          <button
            key={card.key}
            onClick={() => setFilter(filter === card.key ? 'all' : card.key as any)}
            className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${card.color} ${
              filter === card.key ? 'ring-2 ring-offset-1 ring-indigo-400 shadow-md' : ''
            }`}
          >
            <div className="mb-2 opacity-60">{card.icon}</div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs font-medium opacity-80 mt-0.5">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar aluno por nome ou email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 text-sm">
            Nenhum aluno encontrado
          </div>
        ) : (
          filtered.map(student => {
            const status = (student.stripePaymentStatus ?? 'pending') as StripePaymentStatus;
            const cfg = statusConfig[status];
            const planoAtual = student.plano as PlanKey | undefined;
            const isExpanded = expandedStudent === student.id;
            const hasSubscription = !!student.stripeCustomerId;

            return (
              <div key={student.id} className={`rounded-xl border-2 transition-all ${cfg.border} ${cfg.bg}`}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-sm font-bold text-gray-600">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{student.name}</span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {planoAtual && planColors[planoAtual] && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[planoAtual]}`}>
                          {PLANS[planoAtual].label} · {student.periodicidade}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{student.email}</p>
                    {student.nextPaymentAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Próxima cobrança: {new Date(student.nextPaymentAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {hasSubscription ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openPortal(student.stripeCustomerId!)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Portal
                      </button>
                      <button
                        onClick={() => setCobrancaStudent(student)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        Avulso
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm flex-shrink-0"
                    >
                      <CreditCard className="w-3 h-3" />
                      Assinar
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {isExpanded && !hasSubscription && (
                  <div className="border-t border-dashed border-gray-200 p-4 bg-white/60 rounded-b-xl">
                    <p className="text-xs font-medium text-gray-500 mb-3">Selecione o plano para gerar o link:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(Object.keys(PLANS) as PlanKey[]).map(plano =>
                        periodicidades.map(periodo => {
                          const isLoading = generatingLink === `${student.id}-${plano}-${periodo}`;
                          return (
                            <button
                              key={`${plano}-${periodo}`}
                              onClick={() => generateCheckoutLink(student, plano, periodo)}
                              disabled={!!generatingLink}
                              className={`flex flex-col items-start p-3 rounded-lg border-2 transition text-left ${
                                isLoading
                                  ? 'border-indigo-400 bg-indigo-50'
                                  : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                              } disabled:opacity-60`}
                            >
                              <span className={`text-xs font-semibold mb-0.5 ${planColors[plano].split(' ')[1]}`}>
                                {PLANS[plano].label}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">{periodo}</span>
                              <span className="text-sm font-bold text-gray-800 mt-1">
                                R$ {PLANS[plano][periodo].valor.toFixed(2).replace('.', ',')}
                              </span>
                              {isLoading && <span className="text-xs text-indigo-600 mt-1">Gerando...</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {cobrancaStudent && (
        <Modal
          isOpen={!!cobrancaStudent}
          onClose={() => setCobrancaStudent(null)}
          title={`Cobrança avulsa — ${cobrancaStudent.name}`}
          size="md"
        >
          <CobrancaAvulsaModal
            student={cobrancaStudent}
            onClose={() => setCobrancaStudent(null)}
          />
        </Modal>
      )}
    </div>
  );
};