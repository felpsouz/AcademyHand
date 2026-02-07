'use client'

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Video } from '@/types';
import { VideoForm } from './VideoForm';
import { VideoList } from './VideoList';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/hooks/useToast';
import { useVideos } from '@/hooks/useVideos';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const VideosTab: React.FC = () => {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // 🔥 USAR O HOOK useVideos em vez de estado local
  const { videos, loading, error, deleteVideo, refetch } = useVideos();

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
      try {
        await deleteVideo(id);
        showToast('Vídeo removido', 'info');
      } catch (error) {
        showToast('Erro ao remover vídeo', 'error');
      }
    }
  };

  const handlePlay = (video: Video) => {
    window.open(video.url, '_blank');
  };

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingVideo(null);
    // Recarregar a lista de vídeos após salvar
    refetch();
  };

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

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
        onClose={() => {
          setShowModal(false);
          setEditingVideo(null);
        }}
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