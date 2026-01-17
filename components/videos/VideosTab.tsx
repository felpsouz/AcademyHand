'use client'

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Video } from '@/types';
import { VideoForm } from './VideoForm';
import { VideoList } from './VideoList';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks/useToast';

export const VideosTab: React.FC = () => {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Estado dos vídeos - vazio inicialmente
  const [videos, setVideos] = useState<Video[]>([]);

  const handleAddVideo = (videoData: Partial<Video>) => {
    const newVideo: Video = {
      id: Date.now().toString(),
      title: videoData.title || '',
      description: videoData.description || '',
      url: videoData.url || '',
      belt: videoData.belt || 'Branca',
      category: videoData.category || 'Geral',
      duration: videoData.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVideos(prev => [...prev, newVideo]);
    showToast('Vídeo adicionado com sucesso!', 'success');
  };

  const handleUpdateVideo = (id: string, updates: Partial<Video>) => {
    setVideos(prev => prev.map(v => 
      v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    ));
    showToast('Vídeo atualizado com sucesso!', 'success');
  };

  const handleDeleteVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    showToast('Vídeo removido', 'info');
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
      handleDeleteVideo(id);
    }
  };

  const handlePlay = (video: Video) => {
    window.open(video.url, '_blank');
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingVideo(null);
  };

  const handleFormSubmit = (videoData: Partial<Video>) => {
    if (editingVideo) {
      handleUpdateVideo(editingVideo.id, videoData);
    } else {
      handleAddVideo(videoData);
    }
    handleFormSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Vídeos</h2>
        <button 
          onClick={() => {
            setEditingVideo(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Vídeo
        </button>
      </div>

      <VideoList
        videos={videos}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPlay={handlePlay}
      />

      {/* Modal de Vídeo */}
      <Modal
        isOpen={showModal}
        onClose={handleFormSuccess}
        title={editingVideo ? 'Editar Vídeo' : 'Novo Vídeo'}
        size="lg"
      >
        <VideoForm
          video={editingVideo}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  );
};