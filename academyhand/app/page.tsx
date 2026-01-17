'use client'

import { useAuth } from '@/contexts/AuthContext';
import { LoginView } from '@/components/auth/LoginView';
import { AdminView } from '@/components/admin/AdminView';
import { StudentView } from '@/components/student/StudentView';

export default function Home() {
  const { user, userData, loading } = useAuth();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, mostra tela de login
  if (!user) {
    return <LoginView />;
  }

  // Se estiver autenticado mas ainda carregando dados do usuário
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do usuário...</p>
        </div>
      </div>
    );
  }

  // Renderiza view baseado no role do usuário
  // 0 = admin, 1 = student
  if (userData.role === 0) {
    return <AdminView />;
  }

  if (userData.role === 1) {
    return <StudentView />;
  }

  // Fallback se role não for reconhecido
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-600">Tipo de usuário não reconhecido</p>
        <p className="text-gray-600 mt-2">Role: {userData.role}</p>
      </div>
    </div>
  );
}