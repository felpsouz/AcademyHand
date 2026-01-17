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
      
      // Criar objeto base (sem valores undefined)
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

      // Adicionar campos opcionais SOMENTE se tiverem valor
      if (studentData.cpf?.trim()) {
        newStudentData.cpf = studentData.cpf.trim();
      }
      
      if (studentData.phone?.trim()) {
        newStudentData.phone = studentData.phone.trim();
      }

      const newStudent = await firestoreService.addDocument<Student>('students', newStudentData);
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
      
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

      // Criar objeto de atualização sem valores undefined
      const updatedData: any = {
        updatedAt: new Date().toISOString()
      };

      // Adicionar campos que têm valor
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

      // Se mudou a faixa, atualizar histórico
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
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setStudents(prev => prev.map(s => 
        s.id === id ? { ...s, ...updatedData } : s
      ).sort((a, b) => a.name.localeCompare(b.name)));
      
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

  // Excluir aluno
  const deleteStudent = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await firestoreService.deleteDocument('students', id);
      
      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setStudents(prev => prev.filter(s => s.id !== id));
      
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

      // Registrar presença
      const attendanceData = {
        studentId,
        studentName: student.name,
        date: today,
        timestamp: now.toISOString(),
        notes: ''
      };

      await firestoreService.addDocument('attendances', attendanceData);

      // Atualizar contador do aluno
      const newTotal = student.totalAttendances + 1;
      const updatedAt = now.toISOString();

      await firestoreService.updateDocument('students', studentId, {
        totalAttendances: newTotal,
        updatedAt: updatedAt
      });

      // ✅ ATUALIZAR ESTADO LOCAL IMEDIATAMENTE
      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, totalAttendances: newTotal, updatedAt } : s
      ));

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

  // Buscar aluno por ID
  const getStudentById = useCallback((id: string): Student | undefined => {
    return students.find(s => s.id === id);
  }, [students]);

  // Filtrar alunos por status
  const getStudentsByStatus = useCallback((status: StudentStatus): Student[] => {
    return students.filter(s => s.status === status);
  }, [students]);

  // Filtrar alunos por faixa
  const getStudentsByBelt = useCallback((belt: BeltLevel): Student[] => {
    return students.filter(s => s.belt === belt);
  }, [students]);

  // Calcular próxima data de pagamento
  const calculateNextPaymentDue = (lastPayment: string): string => {
    const date = new Date(lastPayment);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
  };

  // Carregar dados inicialmente
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