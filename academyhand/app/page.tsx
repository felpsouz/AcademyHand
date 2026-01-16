'use client'

import React, { useState, createContext, useContext, useCallback } from 'react';
import { LogIn, Users, Activity, CheckCircle2, Calendar, DollarSign, AlertCircle } from 'lucide-react';

// ========== TOAST CONTEXT ==========
const ToastContext = createContext<any>(null);

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = useCallback((message: string, type = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-80"
          >
            ×
          </button>
        </div>
      ))}
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

// ========== AUTH CONTEXT ==========
type ViewMode = 'login' | 'student' | 'admin';

const AuthContext = createContext<any>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [view, setView] = useState<ViewMode>('login');
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Login attempt:', { email, password });
      
      // Simulação de delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (email === 'admin@imperio.com' && password === 'admin123') {
        setView('admin');
      } else {
        setView('student');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setView('login');
  };

  const value = {
    activeView: view,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ========== COMPONENTS ==========
const LoginView = ({ onLogin, isLoading }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Admin: admin@imperio.com / admin123
          </p>
          <p className="text-sm text-gray-500 text-center mt-2">
            Aluno: qualquer email/senha
          </p>
        </div>
      </div>
    </div>
  );
};

const StudentView = ({ onLogout }: any) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aluno Demo</h1>
              <p className="text-sm text-gray-600">Faixa Branca</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Status</span>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">Ativo</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Presenças</span>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">12</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Próximo Vencimento</span>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">15/12/2024</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Meu Painel</h2>
          <p className="text-gray-600">
            Bem-vindo ao seu painel! Em breve você terá acesso a vídeos, histórico de presenças e informações de pagamento.
          </p>
        </div>
      </main>
    </div>
  );
};

const AdminView = ({ onLogout }: any) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
                <p className="text-sm text-gray-600">Painel Administrativo</p>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Painel Administrativo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Total de Alunos</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Receita Mensal</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">R$ 4.800,00</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Presenças Hoje</span>
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Inadimplentes</span>
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
          <p className="text-gray-600">
            Sistema de gestão em desenvolvimento. Em breve você terá acesso completo.
          </p>
        </div>
      </main>
    </div>
  );
};

// ========== APP CONTENT ==========
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

  const handleLogout = () => {
    logout();
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

// ========== MAIN EXPORT ==========
export default function HomePage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}