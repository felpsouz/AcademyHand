'use client'

import React from 'react';
import { Plus } from 'lucide-react';

export const VideosTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Vídeos</h2>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Vídeo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">Biblioteca de vídeos em construção...</p>
      </div>
    </div>
  );
};