import { useState, useEffect } from 'react';
import { Video } from '@/types';
import { videoService } from '@/services/firebase/videos';

export const useVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await videoService.getAllVideos();

      setVideos(data);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const normalizeVideo = (
    videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (videoData.duration == null) {
      throw new Error('Duração é obrigatória');
    }

    return {
      ...videoData,
      duration: videoData.duration,
    };
  };

  const createVideo = async (
    videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const payload = normalizeVideo(videoData);
      await videoService.createVideo(payload);
      await fetchVideos();
    } catch (err) {
      console.error('Error creating video:', err);
      throw err;
    }
  };

  const updateVideo = async (
    id: string,
    videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const payload = normalizeVideo(videoData);
      await videoService.updateVideo(id, payload);
      await fetchVideos();
    } catch (err) {
      console.error('Error updating video:', err);
      throw err;
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await videoService.deleteVideo(id);
      await fetchVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      throw err;
    }
  };

  return {
    videos,
    loading,
    error,
    createVideo,
    updateVideo,
    deleteVideo,
    refetch: fetchVideos,
  };
};