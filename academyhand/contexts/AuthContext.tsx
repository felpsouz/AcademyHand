'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ViewMode, Student } from '@/types';

interface AuthContextType {
  user: any;
  isAdmin: boolean;
  currentStudent: Student | null;
  activeView: ViewMode;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveView: (view: ViewMode) => void;
  setCurrentStudent: (student: Student | null) => void;
}

// Corrigir aqui: criar e exportar o contexto
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Login attempt:', { email, password });
      
      // Simulação de login - você substituirá por Firebase depois
      if (email === 'admin@imperio.com' && password === 'admin123') {
        setIsAdmin(true);
        setActiveView('admin');
      } else {
        // Simulando um aluno
        const mockStudent: Student = {
          id: '1',
          name: 'Aluno Demo',
          email: email,
          belt: 'Branca',
          status: 'active',
          paymentStatus: 'paid',
          monthlyFee: 200,
          lastPayment: new Date().toISOString(),
          nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalAttendances: 12,
          beltHistory: []
        };
        setCurrentStudent(mockStudent);
        setIsAdmin(false);
        setActiveView('student');
      }
      
      setUser({ email });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setIsAdmin(false);
      setCurrentStudent(null);
      setActiveView('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isAdmin,
    currentStudent,
    activeView,
    isLoading,
    login,
    logout,
    setActiveView,
    setCurrentStudent
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};