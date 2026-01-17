'use client'

import React, { useState } from 'react';
import { Video, BeltLevel } from '@/types';
import { Clock, PlayCircle, Edit2, Trash2 } from 'lucide-react';

interface VideoListProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (id: string) => void;
  onPlay: (video: Video) => void;
}

export const VideoList: React.FC<VideoListProps> = ({
  videos,
  onEdit,
  onDelete,
  onPlay
}) => {
  const [filterLevel, setFilterLevel] = useState<BeltLevel | 'all'>('all');

  const filteredVideos = filterLevel === 'all' 
    ? videos 
    : videos.filter(video => video.belt === filterLevel);

  const getBeltColor = (belt: BeltLevel): string => {
    const colors = {
      'Branca': 'bg-gray-100 text-gray-800',
      'Azul': 'bg-blue-100 text-blue-800',
      'Roxa': 'bg-purple-100 text-purple-800',
      'Marrom': 'bg-amber-100 text-amber-800',
      'Preta': 'bg-black text-white'
    };
    return colors[belt];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum vídeo cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as BeltLevel | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="all">Todas as Faixas</option>
            <option value="Branca">Branca</option>
            <option value="Azul">Azul</option>
            <option value="Roxa">Roxa</option>
            <option value="Marrom">Marrom</option>
            <option value="Preta">Preta</option>
          </select>
        </div>
      </div>

      {/* Grid de Vídeos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{video.title}</h3>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBeltColor(video.belt)}`}>
                  {video.belt}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {video.description}
              </p>
              
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(video.duration)}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onPlay(video)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-center rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  Assistir
                </button>
                <button
                  onClick={() => onEdit(video)}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(video.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};