'use client'

import React, { useState, useEffect } from 'react';
import { Student, BeltLevel, StudentStatus } from '@/types';
import { useStudents } from '@/hooks/useStudents';
import { useToast } from '@/hooks/useToast';
import { validateEmail, validatePhone } from '@/utils/validators';

interface StudentFormProps {
  student?: Student | null;
  onSuccess: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSuccess }) => {
  const { addStudent, updateStudent } = useStudents();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    belt: 'Branca' as BeltLevel,
    status: 'active' as StudentStatus,
    monthlyFee: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        cpf: student.cpf || '',
        phone: student.phone || '',
        belt: student.belt || 'Branca',
        status: student.status || 'active',
        monthlyFee: student.monthlyFee?.toString() || '',
      });
    }
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name.trim()) {
      showToast('Nome é obrigatório', 'error');
      return;
    }

    if (!formData.email.trim()) {
      showToast('Email é obrigatório', 'error');
      return;
    }

    if (!validateEmail(formData.email)) {
      showToast('Email inválido', 'error');
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      showToast('Telefone inválido', 'error');
      return;
    }

    const monthlyFee = parseFloat(formData.monthlyFee) || 0;

    try {
      setLoading(true);
      
      // Criar objeto base com campos obrigatórios
      const studentData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        belt: formData.belt,
        status: formData.status,
        monthlyFee,
        paymentStatus: 'paid' as const,
        lastPayment: new Date().toISOString(),
        nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        totalAttendances: student?.totalAttendances || 0,
        beltHistory: student?.beltHistory || []
      };

      // Adicionar CPF somente se tiver valor
      if (formData.cpf.trim()) {
        studentData.cpf = formData.cpf.trim();
      }

      // Adicionar telefone somente se tiver valor
      if (formData.phone.trim()) {
        studentData.phone = formData.phone.trim();
      }

      console.log('Sending student data:', studentData);

      if (student) {
        await updateStudent(student.id, studentData);
        showToast('Aluno atualizado com sucesso!', 'success');
      } else {
        await addStudent(studentData);
        showToast('Aluno cadastrado com sucesso!', 'success');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving student:', error);
      showToast('Erro ao salvar aluno', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="Nome completo"
          disabled={loading}
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="seu@email.com"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF (opcional)
          </label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="000.000.000-00"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone (opcional)
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="(00) 00000-0000"
            disabled={loading}
          />
        </div>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            disabled={loading}
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
            Status *
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            disabled={loading}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensalidade (R$) *
        </label>
        <input
          type="number"
          name="monthlyFee"
          value={formData.monthlyFee}
          onChange={handleChange}
          required
          min="0"
          step="0.01"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="200.00"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : student ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
};