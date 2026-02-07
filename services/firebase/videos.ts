import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';
import { Video, BeltLevel } from '@/types';

export const videoService = {
  // Criar novo vídeo
  async createVideo(data: {
    title: string;
    description: string;
    url: string;
    belt: BeltLevel;
    duration: number;
  }): Promise<string> {
    try {
      const videosRef = collection(db, 'videos');
      
      const docRef = await addDoc(videosRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  },

  // Atualizar vídeo existente
  async updateVideo(id: string, data: {
    title: string;
    description: string;
    url: string;
    belt: BeltLevel;
    duration: number;
  }): Promise<void> {
    try {
      const videoRef = doc(db, 'videos', id);
      
      await updateDoc(videoRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  },

  // Deletar vídeo
  async deleteVideo(id: string): Promise<void> {
    try {
      const videoRef = doc(db, 'videos', id);
      await deleteDoc(videoRef);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  },

  // Buscar todos os vídeos
  async getAllVideos(): Promise<Video[]> {
    try {
      const videosRef = collection(db, 'videos');
      const q = query(videosRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Video[];
    } catch (error) {
      console.error('Error getting videos:', error);
      throw error;
    }
  },

  // Buscar vídeos por faixa
  async getVideosByBelt(belt: BeltLevel): Promise<Video[]> {
    try {
      const videosRef = collection(db, 'videos');
      const q = query(
        videosRef, 
        where('belt', '==', belt),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Video[];
    } catch (error) {
      console.error('Error getting videos by belt:', error);
      throw error;
    }
  }
};