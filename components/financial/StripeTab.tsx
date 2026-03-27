'use client'

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { firestoreService } from '@/services/firebase/firestore';
import { Student, PlanKey, Periodicidade, StripePaymentStatus } from '@/types';
import { PLANS } from '@/lib/plans';
import { CobrancaAvulsaModal } from './CobrancaAvulsaModal';
import { Modal } from '@/components/common/Modal';

const statusConfig: Record<
  StripePaymentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: 'Em dia',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  overdue: {
    label: 'Em atraso',
    color: 'bg-red-100 text-red-700',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-600',
    icon: <XCircle className="w-4 h-4" />,
  },
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-4 h-4" />,
  },
};

export const StripeTab: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [filter, setFilter] = useState<StripePaymentStatus | 'all'>('all');
  const [cobrancaStudent, setCobrancaStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const data = await firestoreService.getDocuments<Student>('students', {
      orderByField: 'name',
      orderDirection: 'asc',
    });
    setStudents(data);
    setLoading(false);
  };

  const generateCheckoutLink = async (
    student: Student,
    plano: PlanKey,
    periodicidade: Periodicidade
  ) => {
    setGeneratingLink(student.id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentEmail: student.email,
          studentName: student.name,
          plano,
          periodicidade,
        }),
      });
      const { url } = await res.json();
      navigator.clipboard.writeText(url);
      alert(`Link copiado! Envie para ${student.name}`);
    } catch {
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

  const filtered = students.filter((s) => {
    if (filter === 'all') return true;
    return (s.stripePaymentStatus ?? 'pending') === filter;
  });

  const stats = {
    active: students.filter((s) => s.stripePaymentStatus === 'active').length,
    overdue: students.filter((s) => s.stripePaymentStatus === 'overdue').length,
    cancelled: students.filter((s) => s.stripePaymentStatus === 'cancelled').length,
    pending: students.filter(
      (s) => !s.stripePaymentStatus || s.stripePaymentStatus === 'pending'
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            key: 'active',
            label: 'Em dia',
            value: stats.active,
            color: 'border-green-500 text-green-600',
          },
          {
            key: 'overdue',
            label: 'Em atraso',
            value: stats.overdue,
            color: 'border-red-500 text-red-600',
          },
          {
            key: 'pending',
            label: 'Pendente',
            value: stats.pending,
            color: 'border-yellow-500 text-yellow-600',
          },
          {
            key: 'cancelled',
            label: 'Cancelado',
            value: stats.cancelled,
            color: 'border-gray-400 text-gray-500',
          },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() =>
              setFilter(filter === card.key ? 'all' : (card.key as StripePaymentStatus))
            }
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 text-left transition hover:shadow-md ${card.color} ${
              filter === card.key ? 'ring-2 ring-offset-1 ring-gray-300' : ''
            }`}
          >
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Lista de alunos */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-400">
            Nenhum aluno neste filtro
          </div>
        ) : (
          filtered.map((student) => {
            const status = (student.stripePaymentStatus ?? 'pending') as StripePaymentStatus;
            const cfg = statusConfig[status];
            const planoAtual = student.plano as PlanKey | undefined;
            const planLabel = planoAtual ? PLANS[planoAtual]?.label : null;

            return (
              <div key={student.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info do aluno */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{student.name}</h4>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                      {planLabel && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                          {planLabel} · {student.periodicidade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">{student.email}</p>
                    {student.nextPaymentAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Próxima cobrança:{' '}
                        {new Date(student.nextPaymentAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2">
                    {student.stripeCustomerId ? (
                      <>
                        <button
                          onClick={() => openPortal(student.stripeCustomerId!)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Portal Stripe
                        </button>

                        <button
                          onClick={() => setCobrancaStudent(student)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <Plus className="w-3 h-3" />
                          Cobrança avulsa
                        </button>
                      </>
                    ) : (
                      /* Aluno sem assinatura — gerar link de checkout */
                      <div className="flex flex-wrap gap-2">
                        {(['gi', 'nogi', 'completo'] as PlanKey[]).map((plano) =>
                          ['mensal', 'trimestral'].map((periodo) => (
                            <button
                              key={`${plano}-${periodo}`}
                              onClick={() =>
                                generateCheckoutLink(student, plano, periodo as Periodicidade)
                              }
                                                            disabled={generatingLink === student.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                              <CreditCard className="w-3 h-3" />
                              {PLANS[plano].label} {periodo}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de cobrança avulsa */}
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

