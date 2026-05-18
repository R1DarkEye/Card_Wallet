'use client';

import React from 'react';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  icon?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

export default function CustomModal({
  isOpen,
  onClose,
  title,
  message,
  icon = '🔔',
  confirmLabel = 'Got it',
  onConfirm,
  type = 'info'
}: CustomModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-icon ${type}`}>{icon}</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <h3>{title}</h3>
          <div className="modal-message">{message}</div>
        </div>
        <div className="modal-footer">
          {onConfirm && (
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
          )}
          <button 
            className={`btn-confirm ${type}`} 
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-container {
          background: white;
          width: 100%;
          max-width: 440px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 24px 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .modal-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .modal-icon.info { background: #eff6ff; color: #2563eb; }
        .modal-icon.warning { background: #fffbeb; color: #d97706; }
        .modal-icon.danger { background: #fef2f2; color: #dc2626; }
        .modal-icon.success { background: #f0fdf4; color: #16a34a; }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .modal-content {
          padding: 20px 24px 32px;
        }

        h3 {
          margin: 0 0 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        .modal-message {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: #475569;
          white-space: pre-wrap;
        }

        .modal-footer {
          padding: 16px 24px 24px;
          background: #f8fafc;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        button {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .btn-confirm {
          min-width: 100px;
        }

        .btn-confirm.info { background: #2563eb; color: white; }
        .btn-confirm.info:hover { background: #1d4ed8; }

        .btn-confirm.warning { background: #f59e0b; color: white; }
        .btn-confirm.warning:hover { background: #d97706; }

        .btn-confirm.danger { background: #dc2626; color: white; }
        .btn-confirm.danger:hover { background: #b91c1c; }

        .btn-confirm.success { background: #16a34a; color: white; }
        .btn-confirm.success:hover { background: #15803d; }
      `}</style>
    </div>
  );
}
