'use client';

import { useState } from 'react';
import { generateMnemonic, decrypt, vault } from '@cardvault/core';
import { useVaultStore } from '../store/useVaultStore';
import styles from './page.module.css';
import AddCardModal from '../components/AddCardModal';
import { db } from '@cardvault/db';
import { useEffect } from 'react';

export default function Home() {
  const [step, setStep] = useState<'welcome' | 'generate' | 'verify'>('welcome');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const { setVaultOpen, isOpen, lockVault } = useVaultStore();

  const fetchCards = async () => {
    const allCards = await db.getAllCards();
    const key = vault.getKey();
    
    const decryptedCards = (await Promise.all(allCards.map(async (card) => {
      try {
        const decryptedData = await decrypt(
          { ciphertext: card.encrypted, iv: card.iv, tag: card.tag },
          key
        );
        return { ...card, data: JSON.parse(decryptedData) };
      } catch (e) {
        // Skip cards that cannot be decrypted with the current key
        return null;
      }
    }))).filter(c => c !== null);
    
    setCards(decryptedCards);
  };

  useEffect(() => {
    if (isOpen) {
      fetchCards();
    }
  }, [isOpen]);

  if (isOpen) {
    return (
      <main className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo">🛡️ CardVault</div>
          <button className="btn-secondary" onClick={lockVault}>Lock Vault</button>
        </header>

        <div className="dashboard-content">
          {cards.length === 0 ? (
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
                <h3>Your Secure Cards</h3>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Add Card</button>
              </div>
              <div className="card-grid">
                {cards.map(card => (
                  <div key={card.id} className="glass-card card-item">
                    <div className="card-type-tag">{card.type}</div>
                    <h4>{card.data.nickname || 'Untitled Card'}</h4>
                    <p className="card-meta">Updated: {new Date(card.updatedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddCardModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={() => {
              setShowAddModal(false);
              fetchCards();
            }} 
          />
        )}

        <style jsx>{`
          .dashboard-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: #0f172a;
          }
          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 40px;
            border-bottom: 1px solid var(--border);
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(8px);
          }
          .logo {
            font-weight: 700;
            font-size: 1.2rem;
          }
          .dashboard-content {
            flex: 1;
            padding: 40px;
          }
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
          .card-list-container {
            max-width: 1000px;
            margin: 0 auto;
            width: 100%;
          }
          .list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
          }
          .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
          }
          .card-item {
            padding: 24px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .card-item:hover {
            transform: translateY(-4px);
            border-color: var(--primary);
          }
          .card-type-tag {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--primary);
            margin-bottom: 8px;
            font-weight: 700;
          }
          .card-meta {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 12px;
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
      await setVaultOpen(generatedMnemonic, 'demo-user-id');
    } catch (e) {
      console.error(e);
      alert('Failed to initialize vault');
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
            <button className="btn-secondary">
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
