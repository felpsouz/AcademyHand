'use client'

import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Plus } from 'lucide-react';

export const FinancialTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Receita do Mês</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ 4.800,00</p>
          <p className="text-sm text-gray-500 mt-1">+12.5% vs mês anterior</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Despesas do Mês</span>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ 1.200,00</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Lucro do Mês</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">R$ 3.600,00</p>
          <p className="text-sm text-gray-500 mt-1">Margem: 75%</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Transação
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">Controle financeiro em construção...</p>
      </div>
    </div>
  );
};