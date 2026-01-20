'use client'

import { useState, useCallback, useEffect } from 'react';
import { Student, StudentStatus, BeltLevel } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useToast } from './useToast';
import { validateEmail, validatePhone } from '@/utils/validators';

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Função helper para atualizar dashboard
  const refreshDashboard = () => {
    if (typeof window !== 'undefined' && (window as any).refreshDashboard) {
      (window as any).refreshDashboard();
    }
  };

  // Carregar alunos
  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await firestoreService.getDocuments<Student>('students', {
        orderByField: 'name',
        orderDirection: 'asc'
      });
      
      setStudents(data);
      return data;
    } catch (err: any) {
      const errorMsg = 'Erro ao carregar alunos';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Adicionar aluno
  const addStudent = useCallback(async (studentData: Partial<Student>) => {
    try {
      setLoading(true);
      setError(null);

      // Validações
      if (!studentData.name || !studentData.email) {
        throw new Error('Nome e email são obrigatórios');
      }

      if (!validateEmail(studentData.email)) {
        throw new Error('Email inválido');
      }

      if (studentData.phone && !validatePhone(studentData.phone)) {
        throw new Error('Telefone inválido (use formato: (00) 00000-0000)');
      }

      // Verificar se email já existe
      const existingStudents = await firestoreService.getDocuments<Student>('students', {
        field: 'email',
        operator: '==',
        value: studentData.email.toLowerCase()
      });

      if (existingStudents.length > 0) {
        throw new Error('Email já cadastrado');
      }

      const now = new Date().toISOString();
      
      const newStudentData: any = {
        name: studentData.name.trim(),
        email: studentData.email.toLowerCase().trim(),
        belt: studentData.belt || 'Branca',
        status: studentData.status || 'active',
        paymentStatus: 'paid',
        monthlyFee: studentData.monthlyFee || 0,
        lastPayment: now,
        nextPaymentDue: calculateNextPaymentDue(now),
        createdAt: now,
        updatedAt: now,
        totalAttendances: 0,
        beltHistory: [{
          from: 'Branca',
          to: studentData.belt || 'Branca',
          date: now,
          notes: 'Cadastro inicial'
        }]
      };

      if (studentData.cpf?.trim()) {
        newStudentData.cpf = studentData.cpf.trim();
      }
      
      if (studentData.phone?.trim()) {
        newStudentData.phone = studentData.phone.trim();
      }

      const newStudent = await firestoreService.addDocument<Student>('students', newStudentData);
      
      setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
      
      // ✅ Atualizar dashboard
      refreshDashboard();
      
      showToast('Aluno cadastrado com sucesso!', 'success');
      return newStudent;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao adicionar aluno';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Atualizar aluno
  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    try {
      setLoading(true);
      setError(null);

      if (updates.email && !validateEmail(updates.email)) {
        throw new Error('Email inválido');
      }

      if (updates.phone && !validatePhone(updates.phone)) {
        throw new Error('Telefone inválido');
      }

      const student = students.find(s => s.id === id);
      if (!student) {
        throw new Error('Aluno não encontrado');
      }

      const updatedData: any = {
        updatedAt: new Date().toISOString()
      };

      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value !== undefined) {
          if (typeof value === 'string') {
            if (value.trim()) {
              updatedData[key] = value.trim();
            }
          } else {
            updatedData[key] = value;
          }
        }
      });

      if (updates.belt && updates.belt !== student.belt) {
        updatedData.beltHistory = [
          ...student.beltHistory,
          {
            from: student.belt,
            to: updates.belt,
            date: new Date().toISOString(),
            notes: updates.beltHistory?.[updates.beltHistory.length - 1]?.notes || 'Graduação'
          }
        ];
      }

      await firestoreService.updateDocument('students', id, updatedData);
      
      setStudents(prev => prev.map(s => 
        s.id === id ? { ...s, ...updatedData } : s
      ).sort((a, b) => a.name.localeCompare(b.name)));
      
      // ✅ Atualizar dashboard
      refreshDashboard();
      
      showToast('Aluno atualizado com sucesso!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar aluno';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, showToast]);

  // ✅ Excluir aluno - CORRIGIDO para deletar de users E students
  const deleteStudent = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Deletar de USERS (para remover login)
      try {
        await firestoreService.deleteDocument('users', id);
        console.log('✅ User document deleted:', id);
      } catch (error) {
        console.warn('User document not found or already deleted:', id);
      }
      
      // 2. Deletar de STUDENTS (dados do aluno)
      await firestoreService.deleteDocument('students', id);
      console.log('✅ Student document deleted:', id);
      
      // NOTA: Não é possível deletar do Firebase Auth pelo client-side
      // O usuário ainda existirá no Authentication, mas sem dados no Firestore
      // Para deletar completamente, seria necessário Firebase Admin SDK no backend
      
      setStudents(prev => prev.filter(s => s.id !== id));
      
      // ✅ Atualizar dashboard
      refreshDashboard();
      
      showToast('Aluno removido com sucesso', 'info');
    } catch (err: any) {
      const errorMsg = 'Erro ao remover aluno';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Marcar presença
  const markAttendance = useCallback(async (studentId: string) => {
    try {
      setLoading(true);
      
      const student = students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Aluno não encontrado');
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const hour = now.getHours();

      if (hour < 6 || hour > 23) {
        throw new Error('Horário inválido para registro (6h-23h)');
      }

      const attendanceData = {
        studentId,
        studentName: student.name,
        date: today,
        timestamp: now.toISOString(),
        notes: ''
      };

      await firestoreService.addDocument('attendances', attendanceData);

      const newTotal = student.totalAttendances + 1;
      const updatedAt = now.toISOString();

      await firestoreService.updateDocument('students', studentId, {
        totalAttendances: newTotal,
        updatedAt: updatedAt
      });

      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, totalAttendances: newTotal, updatedAt } : s
      ));

      // ✅ Atualizar dashboard
      refreshDashboard();

      showToast('Presença confirmada!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao registrar presença';
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, showToast]);

  const getStudentById = useCallback((id: string): Student | undefined => {
    return students.find(s => s.id === id);
  }, [students]);

  const getStudentsByStatus = useCallback((status: StudentStatus): Student[] => {
    return students.filter(s => s.status === status);
  }, [students]);

  const getStudentsByBelt = useCallback((belt: BeltLevel): Student[] => {
    return students.filter(s => s.belt === belt);
  }, [students]);

  const calculateNextPaymentDue = (lastPayment: string): string => {
    const date = new Date(lastPayment);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
  };

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return {
    students,
    loading,
    error,
    loadStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    markAttendance,
    getStudentById,
    getStudentsByStatus,
    getStudentsByBelt
  };
};