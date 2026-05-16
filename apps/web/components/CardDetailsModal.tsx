'use client';

import { useState } from 'react';
import { CardType } from '@cardvault/core';

interface CardDetailsModalProps {
  card: {
    id: string;
    type: CardType;
    data: any;
  };
  onClose: () => void;
}

export default function CardDetailsModal({ card, onClose }: CardDetailsModalProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const { type, data } = card;

  const toggleReveal = () => setIsRevealed(!isRevealed);

  const formatCardNumber = (num: string) => {
    if (!num) return '';
    let display = num;
    if (!isRevealed) {
      // Mask all but last 4 digits
      const cleaned = num.replace(/\s/g, '');
      const last4 = cleaned.slice(-4);
      const masked = cleaned.slice(0, -4).replace(/./g, '•');
      display = masked + last4;
    }
    
    // Group into 4s for realistic look (e.g. XXXX XXXX XXXX XXXX)
    const cleaned = display.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join('   '); // Larger gaps like real cards
  };

  const getCardStyle = () => {
    switch (type) {
      case 'credit':
      case 'debit':
        return {
          background: data.network === 'visa' 
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' // Darker, cleaner blue
            : 'linear-gradient(135deg, #111827 0%, #374151 100%)', // Neutral dark
          color: '#ffffff'
        };
      case 'aadhaar':
        return { background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', color: '#0f172a' };
      case 'passport':
        return { background: 'linear-gradient(135deg, #1e3a8a, #172554)', color: '#ffffff' };
      case 'driving_licence':
        return { background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', color: '#92400e' };
      default:
        return { background: '#1e293b', color: '#ffffff' };
    }
  };

  const cardStyle = getCardStyle();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="card-container">
          <div className="realistic-card" style={cardStyle}>
            <div className="card-inner">
              <div className="card-top">
                <span className="card-label">{type.replace('_', ' ').toUpperCase()}</span>
                {data.network && <span className="network-logo">{data.network.toUpperCase()}</span>}
              </div>
              
              <div className="card-chip">
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
              </div>

              <div className="card-number-section" onClick={toggleReveal}>
                <p className="card-number">{formatCardNumber(data.cardNumber || data.aadhaarNumber || data.passportNumber || data.licenceNumber)}</p>
                <span className="tap-hint">{isRevealed ? 'Tap to hide' : 'Tap to reveal'}</span>
              </div>

              <div className="card-bottom">
                <div className="card-holder">
                  <span className="field-label">NAME</span>
                  <p>{data.nickname || data.givenNames || 'CARD HOLDER'}</p>
                </div>
                {data.expiry && (
                  <div className="card-expiry">
                    <span className="field-label">VALID THRU</span>
                    <p>{data.expiry}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="data-grid">
             {Object.entries(data).map(([key, value]) => {
                const hiddenFields = ['nickname', 'network', 'cardNumber', 'aadhaarNumber', 'passportNumber', 'licenceNumber', 'cvv'];
                if (hiddenFields.includes(key)) return null;
                return (
                  <div key={key} className="data-item">
                    <label>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
                    <p>{String(value)}</p>
                  </div>
                )
             })}
             <div className="data-item">
                <label>CVV / SECURITY CODE</label>
                <p>{isRevealed ? data.cvv || 'N/A' : '•••'}</p>
             </div>
          </div>

          <button className="btn-close-large" onClick={onClose}>Close Vault</button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); backdrop-filter: blur(15px);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .modal-content {
          width: 100%; max-width: 500px; padding: 20px;
        }
        .card-container {
          display: flex; flex-direction: column; gap: 30px; align-items: center;
        }
        .realistic-card {
          width: 100%; aspect-ratio: 1.586/1; border-radius: 18px;
          padding: 24px; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          overflow: hidden; transition: transform 0.3s ease;
        }
        .realistic-card::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(125deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 100%);
        }
        .card-inner { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
        
        .card-top { display: flex; justify-content: space-between; align-items: center; }
        .card-label { font-size: 0.7rem; font-weight: 700; opacity: 0.8; letter-spacing: 1px; }
        .network-logo { font-size: 1.2rem; font-weight: 900; font-style: italic; }

        .card-chip {
          width: 45px; height: 35px; background: linear-gradient(135deg, #d4af37, #f9d976);
          border-radius: 6px; margin-top: 10px; position: relative; padding: 5px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .chip-line { height: 1px; background: rgba(0,0,0,0.2); width: 100%; }

        .card-number-section { margin-top: 25px; cursor: pointer; }
        .card-number { 
          font-size: 1.8rem; 
          font-family: 'OCR A Extended', 'Courier New', Courier, monospace; 
          letter-spacing: 2px; 
          margin: 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          font-weight: 500;
        }
        .tap-hint { 
          font-size: 0.65rem; 
          opacity: 0.6; 
          text-transform: uppercase; 
          margin-top: 8px; 
          display: block;
          letter-spacing: 0.5px;
        }

        .card-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
        .field-label { font-size: 0.6rem; opacity: 0.7; display: block; margin-bottom: 4px; font-weight: 600; }
        .card-holder p { margin: 0; font-size: 1.1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-expiry p { margin: 0; font-size: 1rem; font-weight: 600; }

        .data-grid {
          width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
          background: rgba(255,255,255,0.03); padding: 25px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .data-item label { font-size: 0.7rem; color: #64748b; display: block; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.25px; }
        .data-item p { font-size: 0.95rem; color: #f1f5f9; margin: 0; word-break: break-all; font-weight: 500; }

        .btn-close-large {
          background: #fff; color: #000; border: none; padding: 14px 40px;
          border-radius: 30px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-close-large:hover { transform: scale(1.05); background: #eee; }
      `}</style>
    </div>
  );
}
