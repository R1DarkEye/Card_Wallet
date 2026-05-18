'use client';

import React, { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  };

  if (!isVisible) return (
     <style jsx>{`
        .toast-container {
          opacity: 0;
          transform: translateY(10px);
        }
     `}</style>
  );

  return (
    <div className={`toast-container ${isVisible ? 'visible' : ''}`}>
      <div className={`toast-content ${type}`}>
        <span className="toast-icon">{getIcon()}</span>
        <span className="toast-message">{message}</span>
      </div>

      <style jsx>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          opacity: 0;
          pointer-events: none;
        }

        .toast-container.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
          pointer-events: auto;
        }

        .toast-content {
          background: #1e293b;
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 250px;
        }

        .toast-content.success { border-left: 4px solid #10b981; }
        .toast-content.error { border-left: 4px solid #ef4444; }
        .toast-content.info { border-left: 4px solid #3b82f6; }

        .toast-icon { font-size: 18px; }
        .toast-message { font-size: 14px; font-weight: 500; }
      `}</style>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => setToast(null);

  const ToastElement = toast ? (
    <Toast 
      message={toast.message} 
      type={toast.type} 
      onClose={hideToast} 
    />
  ) : null;

  return { showToast, ToastElement };
}
