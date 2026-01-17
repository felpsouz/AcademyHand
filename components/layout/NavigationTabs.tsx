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
    <nav className="flex gap-2 mt-4 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
  );
};