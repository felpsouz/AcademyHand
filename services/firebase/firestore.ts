import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Interface para dados do usuário
export interface UserData {
  email: string;
  name: string;
  role: 0 | 1; // 0 = admin, 1 = student
  studentId?: string;
}

// Limpar objeto de valores undefined
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    });
    return cleaned;
  }
  
  return obj;
};

// Converter timestamps para Date
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const result: any = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        // Converter Timestamp para Date ISO string
        result[key] = value.toDate().toISOString();
      } else if (Array.isArray(value)) {
        result[key] = value.map(convertTimestamps);
      } else if (key !== 'id') {
        result[key] = convertTimestamps(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  });
  
  return result;
};

// ========== FUNÇÃO ESPECÍFICA PARA USUÁRIOS ==========
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      return null;
    }

    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}

// ========== SERVIÇO GENÉRICO DO FIRESTORE ==========
export const firestoreService = {
  // Obter documento por ID
  async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...convertTimestamps(docSnap.data())
        } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting document ${collectionName}/${id}:`, error);
      throw error;
    }
  },

  // Obter todos os documentos de uma coleção
  async getDocuments<T>(collectionName: string, filters?: {
    field?: string;
    operator?: any;
    value?: any;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<T[]> {
    try {
      let q = collection(db, collectionName) as any;
      
      if (filters?.field && filters?.operator && filters?.value !== undefined) {
        q = query(q, where(filters.field, filters.operator, filters.value));
      }
      
      if (filters?.orderByField) {
        q = query(q, orderBy(filters.orderByField, filters.orderDirection || 'asc'));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as T[];
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  },

  // Adicionar novo documento
  async addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<T> {
    try {
      // Remover valores undefined do objeto
      const cleanedData = removeUndefined(data);
      
      // Adicionar timestamps
      const dataWithTimestamps = {
        ...cleanedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log('Saving to Firestore:', collectionName, dataWithTimestamps);
      
      const docRef = await addDoc(collection(db, collectionName), dataWithTimestamps);
      
      console.log('Document created with ID:', docRef.id);
      
      // Buscar o documento criado para garantir que temos todos os dados
      const createdDoc = await this.getDocument<T>(collectionName, docRef.id);
      
      if (!createdDoc) {
        throw new Error('Failed to retrieve created document');
      }
      
      return createdDoc;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  },

  // Atualizar documento
  async updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    try {
      // Remover valores undefined
      const cleanedData = removeUndefined(data);
      
      const docRef = doc(db, collectionName, id);
      const updateData = {
        ...cleanedData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData as any);
    } catch (error) {
      console.error(`Error updating document ${collectionName}/${id}:`, error);
      throw error;
    }
  },

  // Excluir documento
  async deleteDocument(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${collectionName}/${id}:`, error);
      throw error;
    }
  },

  // Busca paginada
  async getDocumentsPaginated<T>(
    collectionName: string,
    pageSize: number = 10,
    lastDoc?: QueryDocumentSnapshot<DocumentData>,
    filters?: {
      field?: string;
      operator?: any;
      value?: any;
      orderByField?: string;
      orderDirection?: 'asc' | 'desc';
    }
  ): Promise<{
    data: T[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      let q = collection(db, collectionName) as any;
      
      if (filters?.field && filters?.operator && filters?.value !== undefined) {
        q = query(q, where(filters.field, filters.operator, filters.value));
      }
      
      if (filters?.orderByField) {
        q = query(q, orderBy(filters.orderByField, filters.orderDirection || 'asc'));
      }
      
      q = query(q, limit(pageSize));
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as T[];
      
      return {
        data,
        lastDoc: lastVisible as QueryDocumentSnapshot<DocumentData> | null,
        hasMore: querySnapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error(`Error getting paginated documents from ${collectionName}:`, error);
      throw error;
    }
  },

  // Contar documentos
  async countDocuments(
    collectionName: string,
    filters?: {
      field?: string;
      operator?: any;
      value?: any;
    }
  ): Promise<number> {
    try {
      let q = collection(db, collectionName) as any;
      
      if (filters?.field && filters?.operator && filters?.value !== undefined) {
        q = query(q, where(filters.field, filters.operator, filters.value));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error(`Error counting documents in ${collectionName}:`, error);
      throw error;
    }
  }
};