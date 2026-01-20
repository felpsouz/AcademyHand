'use client'

import React, { useState, useEffect } from 'react';
import { Student, BeltLevel, StudentStatus, PaymentStatus } from '@/types';
import { useToast } from '@/hooks/useToast';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/config';
import { firestoreService } from '@/services/firebase/firestore';

interface StudentFormProps {
  student?: Student | null;
  onSuccess: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '', // Nova senha para criar conta
    phone: '',
    belt: 'Branca' as BeltLevel,
    status: 'active' as StudentStatus,
    paymentStatus: 'paid' as PaymentStatus,
    monthlyFee: 0,
  });

  useEffect(() => {
    if (student) {
      setIsEditMode(true);
      setFormData({
        name: student.name || '',
        email: student.email || '',
        password: '', // Não mostra senha no modo edição
        phone: student.phone || '',
        belt: student.belt || 'Branca',
        status: student.status || 'active',
        paymentStatus: student.paymentStatus || 'paid',
        monthlyFee: student.monthlyFee || 0,
      });
    }
  }, [student]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyFee' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('Nome é obrigatório', 'error');
      return;
    }

    if (!formData.email.trim()) {
      showToast('Email é obrigatório', 'error');
      return;
    }

    // Validar senha apenas no modo criação
    if (!isEditMode && (!formData.password || formData.password.length < 6)) {
      showToast('Senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      setLoading(true);
      
      if (isEditMode && student) {
        // MODO EDIÇÃO - apenas atualiza dados no Firestore
        const now = new Date().toISOString();
        
        await firestoreService.updateDocument('students', student.id, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          paymentStatus: formData.paymentStatus,
          monthlyFee: formData.monthlyFee,
          updatedAt: now,
        });

        showToast('Aluno atualizado com sucesso!', 'success');
      } else {
        // MODO CRIAÇÃO - cria conta no Firebase Auth + Students + Users
        
        // 1. Criar usuário usando uma instância secundária do Auth
        // Isso evita deslogar o admin atual
        let secondaryAuth;
        let userId;
        
        try {
          // Tenta usar uma segunda instância do Firebase
          const secondaryApp = initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          }, 'Secondary');
          
          secondaryAuth = getAuth(secondaryApp);
          
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            formData.email.trim(),
            formData.password
          );
          
          userId = userCredential.user.uid;
          
          // Faz logout da conta recém-criada para não interferir
          await secondaryAuth.signOut();
        } catch (error: any) {
          // Se já existe a instância secundária, usa ela
          if (error.code === 'app/duplicate-app') {
            secondaryAuth = getAuth(getApp('Secondary'));
            const userCredential = await createUserWithEmailAndPassword(
              secondaryAuth,
              formData.email.trim(),
              formData.password
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

        // 2. Criar documento na collection USERS (APENAS email, name, role)
        await setDoc(doc(db, 'users', userId), {
          email: formData.email.trim(),
          name: formData.name.trim(),
          role: 1, // 1 = student
        });

        console.log('✅ User document created:', userId);

        // 3. Criar documento na collection STUDENTS (dados completos do aluno)
        await setDoc(doc(db, 'students', userId), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          belt: formData.belt,
          status: formData.status,
          paymentStatus: formData.paymentStatus,
          monthlyFee: formData.monthlyFee,
          lastPayment: now,
          nextPaymentDue: nextMonth.toISOString(),
          totalAttendances: 0,
          beltHistory: [
            {
              from: 'Branca',
              to: formData.belt,
              date: now,
              notes: 'Cadastro inicial',
            },
          ],
          createdAt: now,
          updatedAt: now,
        });

        console.log('✅ Student document created:', userId);

        showToast(
          `Aluno cadastrado! Email: ${formData.email}`,
          'success'
        );
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving student:', error);
      
      let errorMessage = 'Erro ao salvar aluno';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading || isEditMode}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent disabled:bg-gray-100"
        />
        {isEditMode && (
          <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
        )}
      </div>

      {!isEditMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha de Acesso *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Mínimo 6 caracteres"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Esta senha será usada pelo aluno para acessar o portal</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Telefone
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="(00) 00000-0000"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Faixa *
          </label>
          <select
            name="belt"
            value={formData.belt}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="Branca">Branca</option>
            <option value="Azul">Azul</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensalidade (R$) *
          </label>
          <input
            type="number"
            name="monthlyFee"
            step="0.01"
            value={formData.monthlyFee}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status Pagamento
          </label>
          <select
            name="paymentStatus"
            value={formData.paymentStatus}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Atrasado</option>
          </select>
        </div>
      </div>

      {!isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Importante:</strong> Ao cadastrar, o aluno receberá acesso ao portal com o email e senha informados.
            Guarde essas credenciais para passar ao aluno!
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : isEditMode ? 'Atualizar' : 'Cadastrar Aluno'}
        </button>
      </div>
    </form>
  );
};