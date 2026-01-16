import { useState, useCallback } from 'react';
import { Student } from '@/types';
import { studentsService } from '@/services/api/students';

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await studentsService.getAll();
      setStudents(data);
    } catch (err) {
      setError('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = useCallback(async (studentData: Partial<Student>) => {
    try {
      setLoading(true);
      const newStudent = await studentsService.create(studentData);
      setStudents(prev => [...prev, newStudent]);
      return newStudent;
    } catch (err) {
      setError('Erro ao adicionar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    try {
      setLoading(true);
      const updatedStudent = await studentsService.update(id, updates);
      setStudents(prev => prev.map(s => s.id === id ? updatedStudent : s));
      return updatedStudent;
    } catch (err) {
      setError('Erro ao atualizar aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await studentsService.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError('Erro ao excluir aluno');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    students,
    loading,
    error,
    loadStudents,
    addStudent,
    updateStudent,
    deleteStudent
  };
};