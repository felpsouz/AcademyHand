'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/AuthContext';
import { LoginView } from '@/components/auth/LoginView';
import { AdminView } from '@/components/admin/AdminView';
import { StudentView } from '@/components/student/StudentView';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function Home() {
  const { user, userData, loading, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !userData) {
    return <LoginView />;
  }

  // 0 = admin, 1 = student
  if (userData.role === 0) {
    return <AdminView onLogout={handleLogout} />;
  }

  if (userData.role === 1) {
    return <StudentView onLogout={handleLogout} />;
  }

  return <LoginView />;
}