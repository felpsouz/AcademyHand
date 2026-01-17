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

  // Mock data temporário
  const [videos, setVideos] = useState<Video[]>([
    {
      id: '1',
      title: 'Passagem de guarda básica',
      description: 'Técnica fundamental para iniciantes',
      url: 'https://youtube.com/watch?v=abc123',
      level: 'Branca',
      duration: '15:30',
      views: 245,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Finalização com triângulo',
      description: 'Técnica avançada de finalização',
      url: 'https://youtube.com/watch?v=def456',
      level: 'Azul',
      duration: '22:10',
      views: 189,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Defesa contra estrangulamento',
      description: 'Técnicas de defesa essenciais',
      url: 'https://youtube.com/watch?v=ghi789',
      level: 'Roxa',
      duration: '18:45',
      views: 312,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const handleAddVideo = (videoData: Partial<Video>) => {
    const newVideo: Video = {
      id: Date.now().toString(),
      ...videoData as Omit<Video, 'id'>,
      views: 0,
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