'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { getUserData } from '@/services/firebase/firestore';
import { useToast } from '@/hooks/useToast';

interface UserData {
  email: string;
  name: string;
  role: 0 | 1 | 2; // 0 = admin, 1 = student, 2 = master
  studentId?: string;
  academyId: string; // isolamento multi-tenant: identifica a academia do usuário
  academyName?: string; // nome da academia, copiado na criação (client não lê "academies" direto)
  usaGraduacao?: boolean; // controla se a UI mostra campos de faixa/graduação
  usaFacial?: boolean; // controla se a UI mostra foto/sincronização com leitor facial
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const data = await getUserData(user.uid);

          // Trava de segurança no client: se por algum motivo o usuário
          // não tiver academyId, não deixamos ele "meio logado" no sistema.
          if (data && !data.academyId) {
            console.error('Usuário sem academyId associado:', user.uid);
            showToast('Sua conta não está associada a nenhuma academia. Contate o suporte.', 'error');
            await firebaseSignOut(auth);
            setUserData(null);
            setLoading(false);
            return;
          }

          // Verifica se a academia do usuário ainda está ativa
          // (master é sempre liberado, a própria rota já trata isso)
          if (data) {
            try {
              const idToken = await user.getIdToken();
              const res = await fetch('/api/auth/check-academy-status', {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
              });
              const status = await res.json();

              // Só bloqueia se a API confirmar EXPLICITAMENTE que está suspensa.
              // Qualquer outra coisa (erro de token passageiro, resposta inesperada)
              // não deve derrubar o login — só logamos o problema no console.
              if (status.ativa === false) {
                showToast(
                  status.motivo === 'Academia suspensa'
                    ? 'Acesso suspenso. Entre em contato com o suporte.'
                    : 'Não foi possível validar sua academia. Contate o suporte.',
                  'error'
                );
                await firebaseSignOut(auth);
                setUserData(null);
                setLoading(false);
                return;
              }

              if (status.ativa !== true) {
                console.warn('Resposta inesperada ao verificar status da academia:', status);
              }
            } catch (statusError) {
              // Se a checagem falhar por erro de rede/servidor, não bloqueamos o login
              // (evita travar todo mundo fora por uma falha temporária da rota).
              console.error('Erro ao verificar status da academia:', statusError);
            }
          }

          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Login realizado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Erro ao fazer login';
      
      if (error.code === 'auth/invalid-credential') {
        message = 'Email ou senha incorretos';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Usuário não encontrado';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Senha incorreta';
      }
      
      showToast(message, 'error');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
      showToast('Logout realizado com sucesso!', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Erro ao fazer logout', 'error');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}