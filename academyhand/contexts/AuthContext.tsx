'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ViewMode } from '@/types';

interface AuthContextType {
  user: any;
  isAdmin: boolean;
  currentStudent: any;
  activeView: ViewMode;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveView: (view: ViewMode) => void;
  setCurrentStudent: (student: any) => void;
}

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
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [activeView, setActiveView] = useState<ViewMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Login attempt:', { email, password });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (email === 'admin@imperio.com' && password === 'admin123') {
        setIsAdmin(true);
        setActiveView('admin');
      } else {
        const mockStudent = {
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

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    setCurrentStudent(null);
    setActiveView('login');
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