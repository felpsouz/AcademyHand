'use client'

import React, { useState } from 'react';
import { Home, Users, Video, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TabType } from '@/types';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { logout } = useAuth();

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Home },
    { id: 'students' as TabType, label: 'Alunos', icon: Users },
    { id: 'videos' as TabType, label: 'Vídeos', icon: Video },
    { id: 'financial' as TabType, label: 'Financeiro', icon: DollarSign },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h2>
            <p className="text-gray-600">Painel administrativo em construção...</p>
          </div>
        );
      case 'students':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Alunos</h2>
            <p className="text-gray-600">Gerenciamento de alunos em construção...</p>
          </div>
        );
      case 'videos':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vídeos</h2>
            <p className="text-gray-600">Gerenciamento de vídeos em construção...</p>
          </div>
        );
      case 'financial':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Financeiro</h2>
            <p className="text-gray-600">Controle financeiro em construção...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Império Jiu-Jitsu</h1>
                <p className="text-sm text-gray-600">Painel Administrativo</p>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 mt-4 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
};