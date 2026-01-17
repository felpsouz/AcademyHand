'use client'

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/layout/NavigationTabs';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { StudentsTab } from '@/components/students/StudentsTab';
import { VideosTab } from '@/components/videos/VideosTab';
import { FinancialTab } from '@/components/financial/FinancialTab';
import { TabType } from '@/types';

interface AdminViewProps {
  onLogout: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'students':
        return <StudentsTab />;
      case 'videos':
        return <VideosTab />;
      case 'financial':
        return <FinancialTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Império Jiu-Jitsu" subtitle="Painel Administrativo" onLogout={onLogout} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderTabContent()}
      </main>
    </div>
  );
};