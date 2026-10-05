'use client'

import React from 'react';
import { Home, Users, Video, DollarSign } from 'lucide-react';
import { TabType } from '@/types';

interface NavigationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Home },
    { id: 'students' as TabType, label: 'Alunos', icon: Users },
    { id: 'videos' as TabType, label: 'Vídeos', icon: Video },
    { id: 'financial' as TabType, label: 'Financeiro', icon: DollarSign },
  ];

  return (
    <nav className="grid grid-flow-col auto-cols-fr gap-1 sm:flex sm:gap-2 mt-4 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2 py-2 sm:px-4 rounded-lg whitespace-nowrap transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-base ${
              activeTab === tab.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};