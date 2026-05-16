'use client';

import { useEffect, useState } from 'react';
import { generateMnemonic, decrypt, vault, validateMnemonic } from '@cardvault/core';
import { useVaultStore } from '../store/useVaultStore';
import AddCardModal from '../components/AddCardModal';
import CardDetailsModal from '../components/CardDetailsModal';
import { DashboardSkeleton } from '../components/Skeletons';
import {
  db,
  supabase,
  supabaseConfigured,
  setActiveUserId,
  setSupabaseAuthToken
} from '@cardvault/db';

export default function Home() {
  const [step, setStep] = useState<'welcome' | 'generate' | 'verify' | 'restore'>('welcome');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { setVaultOpen, isOpen, lockVault } = useVaultStore();
  const mnemonicStorageKey = 'cardvault_mnemonic';

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const clearAuthContext = () => {
    setSupabaseAuthToken(null);
    setActiveUserId(null);
    setUserId(null);
  };

  const requestMnemonicAuth = async (mnemonic: string) => {
    const response = await fetch('/api/auth/mnemonic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mnemonic })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Auth failed.');
    }
    return payload as { accessToken: string; userId: string; expiresIn: number };
  };

  const activateVaultSession = async (mnemonic: string) => {
    const { accessToken, userId: nextUserId } = await requestMnemonicAuth(mnemonic);
    setSupabaseAuthToken(accessToken);
    setActiveUserId(nextUserId);
    setUserId(nextUserId);
    sessionStorage.setItem(mnemonicStorageKey, mnemonic);
    await setVaultOpen(mnemonic, nextUserId);
    return nextUserId;
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (isOpen) {
      setIsAuthReady(true);
      return;
    }

    const storedMnemonic = sessionStorage.getItem(mnemonicStorageKey);
    if (!storedMnemonic) {
      setIsAuthReady(true);
      return;
    }

    activateVaultSession(storedMnemonic)
      .catch((error) => {
        console.error('Auto-unlock failed:', error);
        sessionStorage.removeItem(mnemonicStorageKey);
        clearAuthContext();
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, [isHydrated, isOpen]);

  useEffect(() => {
    if (!supabaseConfigured || !userId) return;

    const ensureVault = async () => {
      const { error } = await supabase.from('vaults').upsert({ user_id: userId }, { onConflict: 'user_id' });
      if (error) {
        console.error('Vault init failed:', error);
      }
    };

    ensureVault();
  }, [userId]);

  const handleSignOut = async () => {
    sessionStorage.removeItem(mnemonicStorageKey);
    clearAuthContext();
    lockVault();
    setCards([]);
    setStep('welcome');
    setGeneratedMnemonic('');
  };

  const handleRestore = async () => {
    setRestoreError(null);
    setIsRestoring(true);

    try {
      const normalized = restoreMnemonic.trim().toLowerCase();
      if (!validateMnemonic(normalized)) {
        throw new Error('Invalid recovery phrase.');
      }

      await activateVaultSession(normalized);
    } catch (error: any) {
      setRestoreError(error.message || 'Restoration failed. Please check your recovery phrase.');
    } finally {
      setIsRestoring(false);
    }
  };

  const fetchCards = async () => {
    if (!userId || !supabaseConfigured) return;
    setIsLoadingCards(true);
    try {
      const allCards = await db.getAllCards();
      const key = vault.getKey();
      
      // Sort cards by updatedAt descending
      const sortedRaw = allCards.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const decryptedCards = (await Promise.all(sortedRaw.map(async (card) => {
        try {
          const decryptedData = await decrypt(
            { ciphertext: card.encrypted, iv: card.iv, tag: card.tag },
            key
          );
          return { ...card, data: JSON.parse(decryptedData) };
        } catch (e) {
          return null;
        }
      }))).filter(c => c !== null);
      
      setCards(decryptedCards);
    } catch (e) {
      console.error('Fetch failed:', e);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) return;
    
    try {
      await db.deleteCard(id);
      await fetchCards();
      setActiveMenu(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete card');
    }
  };

  useEffect(() => {
    if (isOpen && userId && supabaseConfigured) {
      fetchCards();
    }
  }, [isOpen, userId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isHydrated || !isAuthReady) {
    return (
      <main className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo">🛡️ CardVault</div>
        </header>
        <div className="dashboard-content">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  if (isOpen) {
    return (
      <main className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo">🛡️ CardVault</div>
          <div className="header-actions">
            <button className="btn-ghost" onClick={handleSignOut}>Sign Out</button>
            <button className="btn-secondary" onClick={() => {
              sessionStorage.removeItem(mnemonicStorageKey);
              clearAuthContext();
              lockVault();
            }}>Lock Vault</button>
          </div>
        </header>

        <div className="dashboard-content">
          {isLoadingCards ? (
            <DashboardSkeleton />
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <h3>No cards yet</h3>
              <p>Add your first card to get started</p>
              <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setShowAddModal(true)}>
                Add Card
              </button>
            </div>
          ) : (
            <div className="card-list-container">
              <div className="list-header">
                <div className="list-title">
                  <span className="tiny-label">MY CARDS</span>
                  <h3>Your Secure Wallet</h3>
                </div>
                <div className="list-actions">
                  <button className="btn-link" type="button">View all</button>
                  <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Card</button>
                </div>
              </div>
              <div className="card-grid">
                {cards.map((card) => {
                  const last4 =
                    (card.data.cardNumber || card.data.licenceNumber || '')
                      .toString()
                      .slice(-4);

                  const title = card.type === 'credit'
                    ? 'Credit Card'
                    : card.type === 'debit'
                      ? 'Debit Card'
                      : card.type === 'driving_licence'
                        ? 'Driver Licence'
                        : card.type === 'passport'
                          ? 'Passport'
                          : card.type === 'aadhaar'
                            ? 'Aadhaar ID'
                            : 'Card';

                  const displayName = card.type === 'credit' || card.type === 'debit'
                    ? (card.data.nickname || card.data.cardholderName || card.data.bankName || '')
                    : card.data.name || card.data.nickname || '';

                  const metaLine = card.type === 'credit' || card.type === 'debit'
                    ? `${(card.data.network || 'CARD').toUpperCase()} •••• ${last4}`
                    : card.type === 'driving_licence'
                      ? `License ••••••• ${last4}`
                      : card.data.nickname || '';

                  const expiryText = card.type === 'credit' || card.type === 'debit'
                    ? `Expires ${card.data.expiry || '--/--'}`
                    : card.type === 'driving_licence'
                      ? `Expires ${card.data.expiryDate || '--/--/----'}`
                      : `Updated ${new Date(card.updatedAt).toLocaleDateString()}`;

                  return (
                    <div key={card.id} className="card-display-row glass-card" onClick={() => setViewingCard(card)}>
                      <div className={`card-visual ${card.type}`}>
                        <div className="card-chip"></div>
                        <div className="card-visual-info">
                          <div className="visual-top">
                            {card.type === 'credit' || card.type === 'debit' ? (
                              <span className="network-logo">{(card.data.network || 'CARD').toUpperCase()}</span>
                            ) : (
                              <span className="type-icon">
                                {card.type === 'driving_licence' ? '🚗' :
                                 card.type === 'passport' ? '✈️' :
                                 card.type === 'aadhaar' ? '🆔' : '📄'}
                              </span>
                            )}
                          </div>
                          <div className="visual-bottom">
                            {last4 && <span className="visual-number">•••• {last4}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="card-details-info">
                        <div className="details-header">
                          <div className="title-block">
                            <h4>{title}</h4>
                            {displayName && <span className="card-name">{displayName}</span>}
                          </div>
                          <div className="menu-container" onClick={(e) => e.stopPropagation()}>
                            <button
                              className={`btn-more ${activeMenu === card.id ? 'active' : ''}`}
                              onClick={() => setActiveMenu(activeMenu === card.id ? null : card.id)}
                            >
                              ⋮
                            </button>
                            {activeMenu === card.id && (
                              <div className="dropdown-menu glass-card">
                                <button className="menu-item" onClick={() => {
                                  setEditingCard({
                                    id: card.id,
                                    type: card.type,
                                    data: card.data
                                  });
                                  setShowAddModal(true);
                                  setActiveMenu(null);
                                }}>
                                  <span className="menu-icon">✏️</span> Edit Card
                                </button>
                                <button className="menu-item delete" onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id);
                                }}>
                                  <span className="menu-icon">🗑️</span> Delete Card
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="card-subtitle">{metaLine}</p>

                        <div className={`expiry-badge ${card.type}`}>
                          {expiryText}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddCardModal 
            editData={editingCard}
            onClose={() => {
              setShowAddModal(false);
              setEditingCard(null);
            }} 
            onSuccess={() => {
              setShowAddModal(false);
              setEditingCard(null);
              fetchCards();
            }} 
          />
        )}

        {viewingCard && (
          <CardDetailsModal 
            card={viewingCard}
            onClose={() => setViewingCard(null)}
          />
        )}

        <style jsx>{`
          .dashboard-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: radial-gradient(circle at top left, #1a2140 0%, #0b1020 50%, #0b1020 100%);
          }
          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 40px;
            border-bottom: 1px solid var(--border);
            background: rgba(12, 18, 34, 0.7);
            backdrop-filter: blur(14px);
          }
          .logo {
            font-weight: 800;
            font-size: 1.4rem;
            background: linear-gradient(to right, #ffffff, #c7d2fe);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .header-actions {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .btn-ghost {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-main);
            padding: 10px 18px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-ghost:hover {
            background: rgba(255, 255, 255, 0.12);
          }
          .dashboard-content {
            flex: 1;
            padding: 32px 40px 60px;
          }
          .card-list-container {
            max-width: 980px;
            margin: 0 auto;
            width: 100%;
          }
          .list-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            margin-bottom: 24px;
          }
          .list-title {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .tiny-label {
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #7f8ab3;
          }
          .list-actions {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .btn-link {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 0.85rem;
            cursor: pointer;
          }
          .btn-link:hover {
            color: #ffffff;
          }
          .card-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .card-display-row {
            display: flex;
            padding: 18px 20px;
            gap: 20px;
            align-items: center;
            border-radius: 26px;
            background: linear-gradient(135deg, rgba(22, 31, 52, 0.9), rgba(15, 21, 36, 0.95));
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
          }
          .card-display-row:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.16);
            box-shadow: 0 28px 50px rgba(0, 0, 0, 0.35);
          }

          .card-visual {
            width: 150px;
            height: 90px;
            border-radius: 14px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
          }
          .card-visual::before {
            content: '';
            position: absolute;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            top: -30px;
            right: -25px;
            background: rgba(255, 255, 255, 0.2);
          }
          .card-visual::after {
            content: '';
            position: absolute;
            width: 140px;
            height: 40px;
            left: -20px;
            bottom: -20px;
            background: rgba(255, 255, 255, 0.16);
            transform: rotate(-8deg);
          }
          .card-visual.credit { background: linear-gradient(135deg, #2d6df6, #1d4ed8); }
          .card-visual.debit { background: linear-gradient(135deg, #12b981, #047857); }
          .card-visual.driving_licence { background: linear-gradient(135deg, #fde68a, #f59e0b); }
          .card-visual.passport { background: linear-gradient(135deg, #c7d2fe, #6366f1); }
          .card-visual.aadhaar { background: linear-gradient(135deg, #f4f4f5, #d4d4d8); }

          .card-chip {
            width: 26px;
            height: 18px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            position: relative;
            z-index: 1;
          }

          .card-visual-info {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            width: 100%;
            position: relative;
            z-index: 1;
          }
          .visual-top {
            display: flex;
            justify-content: flex-end;
          }
          .network-logo {
            font-size: 0.8rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: rgba(255, 255, 255, 0.95);
          }
          .type-icon { font-size: 1.1rem; }
          .visual-number {
            font-family: "SFMono-Regular", "Roboto Mono", monospace;
            font-size: 0.82rem;
            letter-spacing: 0.12em;
            color: rgba(255, 255, 255, 0.9);
          }
          .card-visual.driving_licence .visual-number {
            color: #7c4a07;
          }

          .card-details-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .details-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .title-block {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .details-header h4 {
            font-size: 1.05rem;
            color: #ffffff;
            margin: 0;
          }
          .card-name {
            font-size: 0.85rem;
            color: rgba(199, 210, 254, 0.85);
          }
          .card-subtitle {
            color: var(--text-muted);
            font-size: 0.85rem;
            margin: 0;
          }

          .expiry-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            width: fit-content;
          }
          .expiry-badge.credit { background: rgba(59, 130, 246, 0.16); color: #93c5fd; }
          .expiry-badge.debit { background: rgba(16, 185, 129, 0.16); color: #6ee7b7; }
          .expiry-badge.driving_licence { background: rgba(245, 158, 11, 0.18); color: #fcd34d; }

          .menu-container { position: relative; }
          .btn-more {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 4px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .btn-more:hover,
          .btn-more.active {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.12);
          }
          .dropdown-menu {
            position: absolute;
            right: 0;
            top: 100%;
            margin-top: 10px;
            width: 170px;
            z-index: 100;
            padding: 8px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            animation: menuSlide 0.2s ease-out;
          }
          @keyframes menuSlide {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .menu-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border: none;
            background: none;
            color: #e2e8f0;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            border-radius: 10px;
            transition: all 0.2s ease;
            text-align: left;
          }
          .menu-item:hover { background: rgba(255, 255, 255, 0.08); }
          .menu-item.delete { color: #fca5a5; }
          .menu-item.delete:hover { background: rgba(239, 68, 68, 0.16); }
          .menu-icon { font-size: 1rem; }

          .empty-state {
            text-align: center;
            max-width: 300px;
            margin: 100px auto;
          }
          .empty-state .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .empty-state h3 {
            margin-bottom: 8px;
          }
          .empty-state p {
            color: var(--text-muted);
          }

          @media (max-width: 780px) {
            .dashboard-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
            }
            .header-actions {
              width: 100%;
              justify-content: space-between;
            }
            .dashboard-content {
              padding: 24px;
            }
            .list-header {
              flex-direction: column;
              align-items: flex-start;
            }
            .list-actions {
              width: 100%;
              justify-content: space-between;
            }
            .card-display-row {
              flex-direction: column;
              align-items: stretch;
            }
            .card-visual {
              width: 100%;
              height: 120px;
            }
            .details-header {
              align-items: center;
            }
          }
        `}</style>
      </main>
    );
  }

  const handleStart = () => {
    const mnemonic = generateMnemonic();
    setGeneratedMnemonic(mnemonic);
    setStep('generate');
  };

  const handleConfirm = async () => {
    setIsInitializing(true);
    try {
      await activateVaultSession(generatedMnemonic);
      setStep('welcome');
    } catch (e: any) {
      alert('Setup failed: ' + e.message);
    } finally {
      setIsInitializing(false);
    }
  };

  if (step === 'welcome') {
    return (
      <main className="onboarding-container">
        <div className="glass-card main-content">
          <div className="hero-section">
            <div className="logo-badge">🛡️</div>
            <h1>CardVault</h1>
            <p className="subtitle">Zero-knowledge. Offline-first. Your digital identity, secured by you.</p>
          </div>
          
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleStart}>
              Create New Vault
            </button>
            <button className="btn-secondary" onClick={() => setStep('restore')}>
              Restore Existing
            </button>
          </div>
          
          <div className="footer-info">
            <p>MIT Licensed • Open Source • No Cloud Storage</p>
          </div>
        </div>

        <style jsx>{`
          .onboarding-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
          }
          .main-content {
            max-width: 500px;
            width: 100%;
            padding: 48px;
            text-align: center;
            animation: fadeIn 0.8s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .hero-section {
            margin-bottom: 40px;
          }
          .logo-badge {
            font-size: 48px;
            margin-bottom: 16px;
            display: inline-block;
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 24px;
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 12px;
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            color: var(--text-muted);
            line-height: 1.6;
          }
          .action-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .footer-info {
            margin-top: 40px;
            font-size: 0.8rem;
            color: var(--text-muted);
          }
        `}</style>
      </main>
    );
  }

  if (step === 'restore') {
    return (
      <main className="onboarding-container">
        <div className="glass-card main-content">
          <h2>Restore Existing Vault</h2>
          <p className="subtitle">Paste your 12-word recovery phrase to unlock your vault.</p>

          <textarea
            className="mnemonic-input"
            placeholder="word1 word2 word3 ..."
            value={restoreMnemonic}
            onChange={(e) => setRestoreMnemonic(e.target.value)}
            rows={4}
          />

          {restoreError && <div className="restore-error">{restoreError}</div>}

          <button className="btn-primary" onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? 'Unlocking...' : 'Unlock Vault'}
          </button>

          <button className="btn-secondary" onClick={() => setStep('welcome')}>
            Back
          </button>
        </div>

        <style jsx>{`
          .onboarding-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
          }
          .main-content {
            max-width: 520px;
            width: 100%;
            padding: 40px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .mnemonic-input {
            width: 100%;
            min-height: 120px;
            padding: 14px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: var(--text-main);
            font-size: 0.95rem;
            line-height: 1.5;
          }
          .mnemonic-input:focus {
            outline: none;
            border-color: rgba(79, 108, 247, 0.6);
            box-shadow: 0 0 0 3px rgba(79, 108, 247, 0.15);
          }
          .restore-error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
          }
        `}</style>
      </main>
    );
  }

  if (step === 'generate') {
    return (
      <main className="onboarding-container">
        <div className="glass-card main-content">
          <h2>Your Secret Recovery Phrase</h2>
          <p className="warning-text">
            Write down these 12 words in order and keep them safe. 
            If you lose them, your data is gone forever.
          </p>

          <div className="mnemonic-grid">
            {generatedMnemonic.split(' ').map((word, i) => (
              <div key={i} className="mnemonic-word">
                <span className="mnemonic-index">{i + 1}</span>
                {word}
              </div>
            ))}
          </div>

          <button className="btn-primary" style={{ width: '100%' }} onClick={() => setStep('verify')}>
            I've Written It Down
          </button>
        </div>

        <style jsx>{`
          .onboarding-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: radial-gradient(circle at bottom left, #1e1b4b, #0f172a);
          }
          .main-content {
            max-width: 600px;
            width: 100%;
            padding: 40px;
          }
          h2 {
            margin-bottom: 16px;
          }
          .warning-text {
            color: #fbbf24;
            background: rgba(251, 191, 36, 0.1);
            padding: 16px;
            border-radius: 12px;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 24px;
            border: 1px solid rgba(251, 191, 36, 0.2);
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="onboarding-container">
      <div className="glass-card main-content">
        <h2>One last step</h2>
        <p className="subtitle">Ready to encrypt your life? Tap below to initialize your secure vault.</p>
        
        <div style={{ marginTop: '32px' }}>
          <button 
            className="btn-primary" 
            style={{ width: '100%' }} 
            onClick={handleConfirm}
            disabled={isInitializing}
          >
            {isInitializing ? 'Deriving Keys...' : 'Initialize Vault'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .onboarding-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .main-content {
          max-width: 500px;
          width: 100%;
          padding: 40px;
          text-align: center;
        }
      `}</style>
    </main>
  );
}
