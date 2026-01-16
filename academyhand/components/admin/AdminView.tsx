'use client'

import React, { useState } from 'react';
import { Home, Users, Video, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

type TabType = 'dashboard' | 'students' | 'videos' | 'financial';

export const AdminView: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Total de Alunos</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">24</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Receita Mensal</span>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">R$ 4.800,00</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Presenças Hoje</span>
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">15</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Inadimplentes</span>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{activeTab}</h2>
            <p className="text-gray-600">Conteúdo em construção...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              onClick={onLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>

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