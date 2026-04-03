'use client'

import React, { useState, useEffect } from 'react';
import { Student, BeltLevel, StudentStatus } from '@/types';
import { PlanKey, Periodicidade, PLANS } from '@/lib/plans';
import { useToast } from '@/hooks/useToast';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore';
import { CreditCard, Copy, CheckCircle } from 'lucide-react';

interface StudentFormProps {
  student?: Student | null;
  onSuccess: () => void;
}

const planColors: Record<PlanKey, string> = {
  gi:       'border-blue-300 bg-blue-50 text-blue-700',
  nogi:     'border-violet-300 bg-violet-50 text-violet-700',
  completo: 'border-indigo-300 bg-indigo-50 text-indigo-700',
};

const planSelectedColors: Record<PlanKey, string> = {
  gi:       'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
  nogi:     'border-violet-500 bg-violet-100 ring-2 ring-violet-400',
  completo: 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-400',
};

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    belt: 'Branca' as BeltLevel,
    status: 'active' as StudentStatus,
    monthlyFee: 0,
  });

  const [selectedPlano, setSelectedPlano] = useState<PlanKey>('gi');
  const [selectedPeriodicidade, setSelectedPeriodicidade] = useState<Periodicidade>('mensal');
  const [gerarLinkAoCadastrar, setGerarLinkAoCadastrar] = useState(true);

  useEffect(() => {
    if (student) {
      setIsEditMode(true);
      setFormData({
        name: student.name || '',
        email: student.email || '',
        password: '',
        phone: student.phone || '',
        belt: student.belt || 'Branca',
        status: student.status || 'active',
        monthlyFee: student.monthlyFee || 0,
      });
      if (student.plano) setSelectedPlano(student.plano as PlanKey);
      if (student.periodicidade) setSelectedPeriodicidade(student.periodicidade as Periodicidade);
    }
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyFee' ? parseFloat(value) || 0 : value,
    }));
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) { showToast('Nome é obrigatório', 'error'); return; }
    if (!formData.email.trim()) { showToast('Email é obrigatório', 'error'); return; }
    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      showToast('Senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && student) {
        await firestoreService.updateDocument('students', student.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          monthlyFee: formData.monthlyFee,
          updatedAt: new Date().toISOString(),
        });
        showToast('Aluno atualizado com sucesso!', 'success');
        onSuccess();

      } else {
        // Criar conta Firebase Auth
        let secondaryAuth;
        let userId;

        try {
          const secondaryApp = initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          }, 'Secondary');
          secondaryAuth = getAuth(secondaryApp);
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth, formData.email.trim(), formData.password
          );
          userId = userCredential.user.uid;
          await secondaryAuth.signOut();
        } catch (error: any) {
          if (error.code === 'app/duplicate-app') {
            secondaryAuth = getAuth(getApp('Secondary'));
            const userCredential = await createUserWithEmailAndPassword(
              secondaryAuth, formData.email.trim(), formData.password
            );
            userId = userCredential.user.uid;
            await secondaryAuth.signOut();
          } else {
            throw error;
          }
        }

        const now = new Date().toISOString();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await setDoc(doc(db, 'users', userId), {
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: 1,
        });

        await setDoc(doc(db, 'students', userId), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          monthlyFee: PLANS[selectedPlano][selectedPeriodicidade].valor,
          paymentStatus: 'pending',
          stripePaymentStatus: 'pending',
          plano: selectedPlano,
          periodicidade: selectedPeriodicidade,
          lastPayment: now,
          nextPaymentDue: nextMonth.toISOString(),
          totalAttendances: 0,
          beltHistory: [{ from: 'Branca', to: formData.belt, date: now, notes: 'Cadastro inicial' }],
          createdAt: now,
          updatedAt: now,
        });

        showToast(`Aluno cadastrado!`, 'success');

        // Gerar link de pagamento automaticamente
        if (gerarLinkAoCadastrar) {
          const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'subscription',
              studentId: userId,
              studentEmail: formData.email.trim(),
              studentName: formData.name.trim(),
              plano: selectedPlano,
              periodicidade: selectedPeriodicidade,
            }),
          });
          const { url } = await res.json();
          if (url) {
            setGeneratedLink(url);
            navigator.clipboard.writeText(url);
            showToast('Link de pagamento copiado!', 'success');
          }
        } else {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error(error);
      let msg = 'Erro ao salvar aluno';
      if (error.code === 'auth/email-already-in-use') msg = 'Email já cadastrado';
      else if (error.code === 'auth/invalid-email') msg = 'Email inválido';
      else if (error.code === 'auth/weak-password') msg = 'Senha muito fraca';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tela de link gerado
  if (generatedLink) {
    return (
      <div className="space-y-5 py-2">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Aluno cadastrado!</h3>
            <p className="text-sm text-gray-500 mt-1">
              O link de pagamento foi gerado e copiado para a área de transferência.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Link de pagamento:</p>
          <p className="text-xs text-gray-700 break-all font-mono leading-relaxed">
            {generatedLink}
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-700">
          <strong>Plano:</strong> {PLANS[selectedPlano].label} · {selectedPeriodicidade} ·{' '}
          <strong>R$ {PLANS[selectedPlano][selectedPeriodicidade].valor.toFixed(2).replace('.', ',')}</strong>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${
              linkCopied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button
            onClick={onSuccess}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Dados pessoais */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange}
          required disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange}
          required disabled={loading || isEditMode}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:bg-gray-100" />
        {isEditMode && <p className="text-xs text-gray-400 mt-1">Email não pode ser alterado</p>}
      </div>

      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Acesso *</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange}
            required placeholder="Mínimo 6 caracteres" disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
          placeholder="(00) 00000-0000" disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Faixa *</label>
          <select name="belt" value={formData.belt} onChange={handleChange}
            required disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm">
            <option value="Branca">Branca</option>
            <option value="Azul">Azul</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select name="status" value={formData.status} onChange={handleChange}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      {/* Seleção de plano */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">Plano de Assinatura</span>
        </div>

        {/* Modalidade */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modalidade</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PLANS) as PlanKey[]).map(plano => (
              <button
                key={plano}
                type="button"
                onClick={() => {
                  setSelectedPlano(plano);
                  setFormData(prev => ({ ...prev, monthlyFee: PLANS[plano][selectedPeriodicidade].valor }));
                }}
                className={`p-2.5 rounded-xl border-2 text-center transition text-xs font-medium ${
                  selectedPlano === plano ? planSelectedColors[plano] : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {PLANS[plano].label}
              </button>
            ))}
          </div>
        </div>

        {/* Periodicidade */}
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Periodicidade</label>
          <div className="grid grid-cols-2 gap-2">
            {(['mensal', 'trimestral'] as Periodicidade[]).map(periodo => (
              <button
                key={periodo}
                type="button"
                onClick={() => {
                  setSelectedPeriodicidade(periodo);
                  setFormData(prev => ({ ...prev, monthlyFee: PLANS[selectedPlano][periodo].valor }));
                }}
                className={`py-2 rounded-xl border-2 text-sm font-medium capitalize transition ${
                  selectedPeriodicidade === periodo
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {periodo}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo do plano */}
        <div className={`p-3 rounded-xl border-2 ${planColors[selectedPlano]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-80">Plano selecionado</p>
              <p className="text-sm font-semibold mt-0.5">
                {PLANS[selectedPlano].label} · {selectedPeriodicidade}
              </p>
            </div>
            <p className="text-xl font-bold">
              R$ {PLANS[selectedPlano][selectedPeriodicidade].valor.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
      </div>

      {/* Opção de gerar link */}
      {!isEditMode && (
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition">
          <input
            type="checkbox"
            checked={gerarLinkAoCadastrar}
            onChange={e => setGerarLinkAoCadastrar(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">Gerar link de pagamento ao cadastrar</p>
            <p className="text-xs text-gray-500">O link será copiado automaticamente após o cadastro</p>
          </div>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onSuccess} disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50">
          {loading ? 'Salvando...' : isEditMode ? 'Atualizar' : 'Cadastrar Aluno'}
        </button>
      </div>
    </form>
  );
};
