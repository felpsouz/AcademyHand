'use client'

import React from 'react';
import { Users } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-xs sm:text-sm text-gray-600 truncate">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};