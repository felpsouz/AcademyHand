'use client'

import React, { useState, useEffect } from 'react';
import { Video, BeltLevel } from '@/types';
import { useToast } from '@/hooks/useToast';
import { validateURL } from '@/utils/validators';
import { videoService } from '@/services/firebase/videos';

interface VideoFormProps {
  video?: Video | null;
  onSuccess: () => void;
}

export const VideoForm: React.FC<VideoFormProps> = ({ video, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    belt: 'Branca' as BeltLevel,
    duration: 0,
  });

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || '',
        description: video.description || '',
        url: video.url || '',
        belt: video.belt || 'Branca',
        duration: video.duration || 0,
      });
    }
  }, [video]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showToast('Título é obrigatório', 'error');
      return;
    }

    if (!formData.url.trim()) {
      showToast('URL é obrigatória', 'error');
      return;
    }

    if (!validateURL(formData.url)) {
      showToast('URL inválida', 'error');
      return;
    }

    try {
      setLoading(true);
      
      if (video?.id) {
        // Atualizar vídeo existente
        await videoService.updateVideo(video.id, formData);
        showToast('Vídeo atualizado com sucesso!', 'success');
      } else {
        // Criar novo vídeo
        await videoService.createVideo(formData);
        showToast('Vídeo adicionado com sucesso!', 'success');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving video:', error);
      showToast('Erro ao salvar vídeo', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="Título do vídeo"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="Descrição do conteúdo"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL do Vídeo *
        </label>
        <input
          type="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          placeholder="https://youtube.com/watch?v=..."
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nível *
          </label>
          <select
            name="belt"
            value={formData.belt}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            disabled={loading}
          >
            <option value="Branca">Branca</option>
            <option value="Azul">Azul</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duração (segundos)
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="0"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onSuccess}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : video ? 'Atualizar' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
};