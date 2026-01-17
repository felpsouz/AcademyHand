import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  UserCredential,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from './config';
import { firestoreService } from './firestore';

export interface UserData {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'student';
  studentId?: string;
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  // Login com email/senha
  async login(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  // Registrar novo usuário
  async register(
    email: string, 
    password: string, 
    userData: Omit<UserData, 'uid' | 'createdAt' | 'updatedAt'>
  ): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Atualizar perfil do usuário
    if (userData.name) {
      await updateProfile(userCredential.user, {
        displayName: userData.name
      });
    }

    // Salvar dados adicionais no Firestore
    const userDoc: UserData = {
      uid: userCredential.user.uid,
      email: userCredential.user.email || email,
      name: userData.name,
      role: userData.role,
      studentId: userData.studentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestoreService.addDocument('users', userDoc);
    
    return userCredential;
  },

  // Logout
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Obter usuário atual
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Observer para mudanças de autenticação
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Obter dados do usuário do Firestore
  async getUserData(uid: string): Promise<UserData | null> {
    return await firestoreService.getDocument<UserData>('users', uid);
  },

  // Verificar se é admin
  async isAdmin(uid: string): Promise<boolean> {
    const userData = await this.getUserData(uid);
    return userData?.role === 'admin';
  }
};