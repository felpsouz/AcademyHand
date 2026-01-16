'use client'

import React, { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ToastMessage, ToastType } from '@/types';

interface ToastProps extends ToastMessage {
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: AlertCircle
  };

  const Icon = icons[type];

  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${styles[type]} px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <p className="font-medium text-sm sm:text-base">{message}</p>
      <button 
        onClick={onClose} 
        className="ml-2 hover:opacity-80 flex-shrink-0"
        aria-label="Fechar notificação"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
};