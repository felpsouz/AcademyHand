'use client'

import { useState, useCallback, useEffect } from 'react';
import { Video, BeltLevel } from '@/types';
import { firestoreService } from '@/services/firebase/firestore';
import { useToast } from './useToast';
import { validateURL } from '@/utils/validators';

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Carregar vídeos
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await firestoreService.getDocuments<Video>('videos', {
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
      
      setVideos(data);
      return data;
    } catch (err: any) {
      const errorMsg = 'Erro ao carregar vídeos';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Adicionar vídeo
  const addVideo = useCallback(async (videoData: Partial<Video>) => {
    try {
      setLoading(true);
      setError(null);

      if (!videoData.title || !videoData.url) {
        throw new Error('Título e URL são obrigatórios');
      }

      if (!validateURL(videoData.url)) {
        throw new Error('URL inválida');
      }

      const now = new Date().toISOString();
      const newVideoData: Omit<Video, 'id'> = {
        title: videoData.title.trim(),
        description: videoData.description?.trim() || '',
        url: videoData.url.trim(),
        level: videoData.level || 'Branca',
        duration: videoData.duration || '00:00',
        views: 0,
        createdAt: now,
        updatedAt: now
      };

      const newVideo = await firestoreService.addDocument<Video>('videos', newVideoData);
      setVideos(prev => [newVideo, ...prev]);
      
      showToast('Vídeo adicionado com sucesso!', 'success');
      return newVideo;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao adicionar vídeo';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Atualizar vídeo
  const updateVideo = useCallback(async (id: string, updates: Partial<Video>) => {
    try {
      setLoading(true);
      setError(null);

      if (updates.url && !validateURL(updates.url)) {
        throw new Error('URL inválida');
      }

      const updatedData: Partial<Video> = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await firestoreService.updateDocument('videos', id, updatedData);
      
      setVideos(prev => prev.map(v => 
        v.id === id ? { ...v, ...updatedData } : v
      ));
      
      showToast('Vídeo atualizado com sucesso!', 'success');
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar vídeo';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Excluir vídeo
  const deleteVideo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await firestoreService.deleteDocument('videos', id);
      setVideos(prev => prev.filter(v => v.id !== id));
      
      showToast('Vídeo removido com sucesso', 'info');
    } catch (err: any) {
      const errorMsg = 'Erro ao remover vídeo';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Incrementar visualizações
  const incrementViews = useCallback(async (id: string) => {
    try {
      const video = videos.find(v => v.id === id);
      if (!video) return;

      const newViews = video.views + 1;
      await firestoreService.updateDocument('videos', id, {
        views: newViews,
        updatedAt: new Date().toISOString()
      });

      setVideos(prev => prev.map(v => 
        v.id === id ? { ...v, views: newViews } : v
      ));
    } catch (err) {
      console.error('Error incrementing views:', err);
    }
  }, [videos]);

  // Filtrar vídeos por nível
  const getVideosByLevel = useCallback((level: BeltLevel): Video[] => {
    return videos.filter(v => v.level === level);
  }, [videos]);

  // Obter vídeo por ID
  const getVideoById = useCallback((id: string): Video | undefined => {
    return videos.find(v => v.id === id);
  }, [videos]);

  // Carregar dados inicialmente
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  return {
    videos,
    loading,
    error,
    loadVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    incrementViews,
    getVideosByLevel,
    getVideoById
  };
};