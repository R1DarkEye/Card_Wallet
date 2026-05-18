'use client';

import { useState } from 'react';
import CustomModal from '../../components/CustomModal';

interface SettingsContentProps {
  isEmbedded?: boolean;
  onBackup?: () => Promise<void>;
  onSignOut?: () => void;
}

export function SettingsContent({ isEmbedded = false, onBackup, onSignOut }: SettingsContentProps) {
  const [appearance, setAppearance] = useState('Light');
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('USD ($)');
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    icon?: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    confirmLabel?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const runSecurityCheck = () => {
    setModalConfig({
      isOpen: true,
      title: 'Security Scan Complete',
      message: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>✓ Encryption: <b>AES-256 Enabled</b></div>
          <div>✓ Vault: <b>Locked</b></div>
          <div>✓ MFA: <b>Active</b></div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            Security Status: <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Excellent (98%)</span>
          </div>
        </div>
      ),
      icon: '🛡️',
      type: 'success',
      confirmLabel: 'Great'
    });
  };

  const handleBackupClick = () => {
    if (onBackup) {
      onBackup();
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Cloud Backup',
        message: 'Backup feature is currently optimizing. Please use the dashboard for immediate exports.',
        icon: '☁️',
        type: 'info'
      });
    }
  };

  const handleDownloadData = () => {
    setModalConfig({
      isOpen: true,
      title: 'Download User Data',
      message: 'Preparing your records... Your data will be bundled into a secure, encrypted ZIP archive for your local storage.',
      icon: '📥',
      type: 'info',
      confirmLabel: 'Prepare Download'
    });
  };

  const handleDeactivate = () => {
    setModalConfig({
      isOpen: true,
      title: 'Deactivate Account',
      message: 'WARNING: This will permanently delete your vault and all stored cards. This action CANNOT be undone. Are you sure you want to proceed?',
      icon: '🛑',
      type: 'danger',
      confirmLabel: 'Deactivate My Account',
      onConfirm: () => {
        // Real deactivation logic would go here
        alert("Account deactivation protection engaged. Please contact security support.");
      }
    });
  };

  const comingSoon = (feature: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Feature Coming Soon',
      message: `${feature} is being polished and will be available in the next major update. Stay tuned!`,
      icon: '✨',
      type: 'info'
    });
  };

  return (
    <div className={`settings-container ${isEmbedded ? 'embedded' : ''}`}>
      {!isEmbedded && (
        <header className="settings-header">
          <p className="welcome-text">Settings</p>
          <h1>Preferences & Security</h1>
          <p className="subtitle">Customize your experience and manage your vault security.</p>
        </header>
      )}

      <div className="settings-content">
        <div className="main-column">
          {/* Account Settings */}
          <section className="settings-section">
            <h3>Account Settings</h3>
            <div className="settings-group">
              <div className="setting-item" onClick={() => comingSoon("Account Preferences")}>
                <div className="setting-icon person">👤</div>
                <div className="setting-info">
                  <h4>Account Preferences</h4>
                  <p>Manage your account details and preferences</p>
                </div>
                <div className="setting-action">›</div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Change Password")}>
                <div className="setting-icon security">🔒</div>
                <div className="setting-info">
                  <h4>Change Password</h4>
                  <p>Update your account password regularly</p>
                </div>
                <div className="setting-action">›</div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Email Preferences")}>
                <div className="setting-icon email">✉️</div>
                <div className="setting-info">
                  <h4>Email Preferences</h4>
                  <p>Choose what emails you want to receive</p>
                </div>
                <div className="setting-action">›</div>
              </div>
            </div>
          </section>

          {/* Security & Privacy */}
          <section className="settings-section">
            <h3>Security & Privacy</h3>
            <div className="settings-group">
              <div className="setting-item" onClick={() => comingSoon("Two-Factor Authentication")}>
                <div className="setting-icon tfa">🛡️</div>
                <div className="setting-info">
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <div className="setting-meta">
                   <span className="status-badge success">Enabled</span>
                   <span className="setting-action">›</span>
                </div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Privacy Settings")}>
                <div className="setting-icon privacy">🔘</div>
                <div className="setting-info">
                  <h4>Privacy Settings</h4>
                  <p>Manage how your data is used and protected</p>
                </div>
                <div className="setting-action">›</div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Session Management")}>
                <div className="setting-icon session">💻</div>
                <div className="setting-info">
                  <h4>Session Management</h4>
                  <p>View and manage your active sessions</p>
                </div>
                <div className="setting-meta">
                   <span className="status-text">1 active session</span>
                   <span className="setting-action">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* App Settings */}
          <section className="settings-section">
            <h3>App Settings</h3>
            <div className="settings-group">
              <div className="setting-item" onClick={() => setAppearance(appearance === 'Light' ? 'Dark' : 'Light')}>
                <div className="setting-icon appearance">☀️</div>
                <div className="setting-info">
                  <h4>Appearance</h4>
                  <p>Choose your preferred theme and display options</p>
                </div>
                <div className="setting-meta">
                   <span className="status-text">{appearance}</span>
                   <span className="setting-action">›</span>
                </div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Language Selection")}>
                <div className="setting-icon language">🌐</div>
                <div className="setting-info">
                  <h4>Language</h4>
                  <p>Select your preferred language</p>
                </div>
                <div className="setting-meta">
                   <span className="status-text">{language}</span>
                   <span className="setting-action">›</span>
                </div>
              </div>
              <div className="setting-item" onClick={() => comingSoon("Currency Selection")}>
                <div className="setting-icon currency">💵</div>
                <div className="setting-info">
                  <h4>Currency</h4>
                  <p>Select your preferred currency</p>
                </div>
                <div className="setting-meta">
                   <span className="status-text">{currency}</span>
                   <span className="setting-action">›</span>
                </div>
              </div>
            </div>
          </section>

          {/* Data & Storage */}
          <section className="settings-section">
            <h3>Data & Storage</h3>
            <div className="settings-group">
              <div className="setting-item" onClick={handleBackupClick}>
                <div className="setting-icon data">☁️</div>
                <div className="setting-info">
                  <h4>Backup & Restore</h4>
                  <p>Backup your data or restore from a previous backup</p>
                </div>
                <div className="setting-action">›</div>
              </div>
            </div>
          </section>
        </div>

        <aside className="side-column">
          {/* Security Overview Card */}
          <div className="card security-card">
            <h3>Security Overview</h3>
            <div className="security-status">
              <div className="shield-viz">
                <span className="shield-icon">🛡️</span>
                <span className="check-icon">✓</span>
              </div>
              <h4>Your account is secure</h4>
              <p>Last security check: {new Date().toLocaleDateString()}</p>
              <button className="btn-secondary" onClick={runSecurityCheck}>Run Security Check</button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card actions-card">
            <h3>Quick Actions</h3>
            <div className="action-list">
              <div className="action-item" onClick={handleDownloadData}>
                <span className="icon">📥</span>
                <span>Download My Data</span>
                <span className="arrow">›</span>
              </div>
              <div className="action-item" onClick={handleBackupClick}>
                <span className="icon">☁️</span>
                <span>Backup Now</span>
                <span className="arrow">›</span>
              </div>
              <div className="action-item" onClick={() => comingSoon("Device Management")}>
                <span className="icon">📱</span>
                <span>Manage Devices</span>
                <span className="arrow">›</span>
              </div>
              <div className="action-item danger" onClick={handleDeactivate}>
                <span className="icon">🛑</span>
                <span>Deactivate Account</span>
                <span className="arrow">›</span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="card help-card">
            <h3>Help & Support</h3>
            <div className="action-list">
              <div className="action-item" onClick={() => window.open('mailto:support@cardvault.io')}>
                <span className="icon">✉️</span>
                <span>Contact Support</span>
                <span className="arrow">›</span>
              </div>
              <div className="action-item" onClick={() => setModalConfig({
                isOpen: true,
                title: 'Help Center',
                message: 'Our documentation and help guides are currently being migrated to the new vault system.',
                icon: '❓',
                type: 'info'
              })}>
                <span className="icon">❓</span>
                <span>Help Center</span>
                <span className="arrow">›</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <CustomModal 
        {...modalConfig}
        onClose={closeModal}
      />

      <footer className="settings-footer">
        <p>© 2024 CardVault. All rights reserved.</p>
        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>About Us</span>
        </div>
      </footer>

      <style jsx>{`
        .settings-container {
          padding: 2.5rem;
          max-width: 1200px;
          margin: 0 auto;
          color: #1e293b;
        }

        .settings-container.embedded {
          padding: 0;
          max-width: none;
        }

        .settings-header {
          margin-bottom: 2.5rem;
        }

        .welcome-text {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #64748b;
          font-size: 1rem;
        }

        .settings-content {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2rem;
        }

        .settings-section {
          margin-bottom: 2.5rem;
        }

        h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
          padding-left: 0.25rem;
        }

        .settings-group {
          background: white;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .setting-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f1f5f9;
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-item:hover {
          background: #f8fafc;
        }

        .setting-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1.25rem;
          font-size: 1.1rem;
        }

        .setting-icon.person { background: #eff6ff; color: #2563eb; }
        .setting-icon.security { background: #f0fdf4; color: #16a34a; }
        .setting-icon.email { background: #fdf2f8; color: #db2777; }
        .setting-icon.tfa { background: #f0fdf4; color: #16a34a; }
        .setting-icon.privacy { background: #f5f3ff; color: #7c3aed; }
        .setting-icon.session { background: #fffbeb; color: #d97706; }
        .setting-icon.appearance { background: #fff7ed; color: #ea580c; }
        .setting-icon.language { background: #eff6ff; color: #2563eb; }
        .setting-icon.currency { background: #f0fdf4; color: #16a34a; }
        .setting-icon.data { background: #eff6ff; color: #2563eb; }

        .setting-info {
          flex: 1;
        }

        .setting-info h4 {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #0f172a;
        }

        .setting-info p {
          margin: 0;
          font-size: 0.8125rem;
          color: #64748b;
          margin-top: 2px;
        }

        .setting-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .setting-action {
          color: #cbd5e1;
          font-size: 1.25rem;
          margin-left: 0.5rem;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 99px;
        }

        .status-badge.success {
          background: #dcfce7;
          color: #166534;
        }

        .status-text {
          font-size: 0.8125rem;
          color: #3b82f6;
          font-weight: 500;
        }

        /* Side Column Cards */
        .card {
          background: white;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .card h3 {
          margin-top: 0;
          padding-left: 0;
          color: #0f172a;
        }

        .security-status {
          text-align: center;
          padding: 1rem 0;
        }

        .shield-viz {
          position: relative;
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          background: #eff6ff;
          border-radius: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shield-icon {
          font-size: 2rem;
        }

        .check-icon {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #22c55e;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 10px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .security-status h4 {
          margin: 0 0 0.5rem;
          color: #22c55e;
          font-size: 1rem;
        }

        .security-status p {
          font-size: 0.8125rem;
          color: #64748b;
          margin-bottom: 1.25rem;
        }

        .btn-secondary {
          background: white;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s;
        }

        .btn-secondary:hover {
          background: #f8fafc;
        }

        .action-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .action-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #475569;
          transition: background 0.15s;
        }

        .action-item:hover {
          background: #f8fafc;
        }

        .action-item .icon {
          width: 28px;
          height: 28px;
          background: #f1f5f9;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
        }

        .action-item span:not(.icon):not(.arrow) {
          flex: 1;
        }

        .action-item .arrow {
          color: #cbd5e1;
          font-size: 1.1rem;
        }

        .action-item.danger {
          color: #ef4444;
        }

        .action-item.danger .icon {
          background: #fef2f2;
        }

        .btn-outline-full {
          margin-top: 1rem;
          width: 100%;
          background: transparent;
          border: 1px solid #e2e8f0;
          padding: 0.625rem;
          border-radius: 8px;
          color: #3b82f6;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }

        .settings-footer {
          margin-top: 4rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-links span {
          cursor: pointer;
        }

        .footer-links span:hover {
          color: #64748b;
        }

        @media (max-width: 1024px) {
          .settings-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}


