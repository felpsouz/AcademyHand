'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface AcademiaResumo {
  id: string;
  nome: string;
  ativa: boolean;
  criadaEm?: string | null;
  stripeSecretKeyMascarada?: string;
  totalAdmins?: number;
  totalAlunos?: number;
}

export interface Totais {
  totalAcademias: number;
  academiasAtivas: number;
  totalAdmins: number;
  totalAlunos: number;
}

export function useMasterPanel() {
  const { user } = useAuth();
  const [academias, setAcademias] = useState<AcademiaResumo[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Usuário não autenticado');
    return user.getIdToken();
  }, [user]);

  const chamarApi = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }
    return data;
  }, [getToken]);

  // Carrega a visão geral (academias + contagens de admins/alunos)
  const carregarOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chamarApi('/api/master/overview');
      setAcademias(data.academias);
      setTotais(data.totais);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [chamarApi]);

  // Cria uma nova academia
  const criarAcademia = useCallback(async (payload: {
    nome: string;
    usaGraduacao: boolean;
    usaFacial: boolean;
    device?: { ip: string; port: string; user: string; pass: string };
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    academyId?: string;
  }) => {
    const data = await chamarApi('/api/master/academies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await carregarOverview();
    return data;
  }, [chamarApi, carregarOverview]);

  // Ativa ou suspende uma academia
  const alternarStatusAcademia = useCallback(async (academyId: string, ativa: boolean) => {
    const data = await chamarApi(`/api/master/academies/${academyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativa }),
    });
    await carregarOverview();
    return data;
  }, [chamarApi, carregarOverview]);

  // Cria um admin ou aluno em qualquer academia
  const criarUsuario = useCallback(async (payload: {
    email: string;
    password: string;
    name: string;
    role: 0 | 1;
    academyId: string;
    studentId?: string;
  }) => {
    const data = await chamarApi('/api/master/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await carregarOverview();
    return data;
  }, [chamarApi, carregarOverview]);

  return {
    academias,
    totais,
    loading,
    error,
    carregarOverview,
    criarAcademia,
    alternarStatusAcademia,
    criarUsuario,
  };
}