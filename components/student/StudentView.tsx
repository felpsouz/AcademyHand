'use client'

import React, { useState } from 'react';
import { 
  Users, Activity, CheckCircle2, Calendar, Video, 
  Clock, PlayCircle, History, CheckCircle 
} from 'lucide-react';

interface StudentViewProps {
  onLogout: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ onLogout }) => {
  const [videos] = useState([
    { id: 1, title: 'Passagem de guarda básica', level: 'Branca', duration: '15:30' },
    { id: 2, title: 'Defesa básica de estrangulamento', level: 'Branca', duration: '12:45' },
    { id: 3, title: 'Montada e controle', level: 'Branca', duration: '18:20' },
  ]);

  const [attendance] = useState([
    { id: 1, date: '15/12/2024', time: '19:30' },
    { id: 2, date: '14/12/2024', time: '19:30' },
    { id: 3, date: '12/12/2024', time: '20:00' },
    { id: 4, date: '10/12/2024', time: '19:30' },
    { id: 5, date: '08/12/2024', time: '20:00' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aluno Demo</h1>
              <p className="text-sm text-gray-600">Faixa Branca</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Status</span>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">Ativo</p>
            <p className="text-sm text-gray-500 mt-1">Próxima graduação em 60 dias</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Presenças</span>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">12</p>
            <p className="text-sm text-gray-500 mt-1">Este mês: 8 presenças</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Próximo Vencimento</span>
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">15/12/2024</p>
            <p className="text-sm text-gray-500 mt-1">Status: Em dia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Vídeos - Faixa Branca
              </h2>
            </div>

            <div className="space-y-4">
              {videos.map(video => (
                <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{video.title}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {video.level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {video.duration}
                    </span>
                    <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1">
                      <PlayCircle className="w-4 h-4" />
                      Assistir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">Histórico de Presenças</h2>
            </div>

            <div className="space-y-2">
              {attendance.map(record => (
                <div key={record.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-gray-900">{record.date}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {record.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};