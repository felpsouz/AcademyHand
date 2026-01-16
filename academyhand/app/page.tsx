'use client'

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoginView } from '@/components/auth/LoginView';
import { StudentView } from '@/components/student/StudentView';
import { AdminView } from '@/components/admin/AdminView';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

// Componente que usa os hooks
const AppContent = () => {
  const { activeView, login, logout, isLoading } = useAuth();
  const { showToast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      showToast('Login realizado com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao fazer login', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Logout realizado', 'info');
  };

  if (activeView === 'login') {
    return <LoginView onLogin={handleLogin} isLoading={isLoading} />;
  }

  if (activeView === 'student') {
    return <StudentView onLogout={handleLogout} />;
  }

  return <AdminView onLogout={handleLogout} />;
};

// Componente principal
export default function Home() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}