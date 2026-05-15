'use client';

import { useState, useEffect } from 'react';
import { encrypt, vault, CardType, CardSchemas } from '@cardvault/core';
import { db } from '@cardvault/db';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCardModal({ onClose, onSuccess }: AddCardModalProps) {
  const [type, setType] = useState<CardType>('credit');
  const [formData, setFormData] = useState<Record<string, string>>({
    network: 'visa',
    nickname: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    // 1. Filter characters based on field type
    if (field === 'cardNumber') {
      const rawValue = value.replace(/\D/g, '');
      const groups = rawValue.match(/.{1,4}/g) || [];
      formattedValue = groups.join(' ');
    } else if (field === 'aadhaarNumber') {
      const rawValue = value.replace(/\D/g, ''); // Get only numbers
      const groups = rawValue.match(/.{1,4}/g) || [];
      formattedValue = groups.join(' '); // Add spaces (XXXX XXXX XXXX)
    } else if (field === 'passportNumber') {
      const first = value.slice(0, 1).toUpperCase().replace(/[^A-Z]/g, '');
      const rest = value.slice(1).replace(/\D/g, '').slice(0, 8);
      formattedValue = first + rest;
    } else if (['surname', 'givenNames', 'placeOfBirth', 'placeOfIssue'].includes(field)) {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, ''); // Letters and spaces only
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase()); // Auto-capitalize
    } else if (field === 'countryCode') {
      formattedValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    } else if (field === 'type') {
      formattedValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    } else if (field === 'sex') {
      const v = value.toUpperCase().replace(/[^MFX]/g, '');
      formattedValue = v.slice(0, 1);
    } else if (['dob', 'dateOfIssue', 'dateOfExpiry'].includes(field)) {
      formattedValue = value.replace(/[^0-9/]/g, '');
      if ((formattedValue.length === 2 || formattedValue.length === 5) && 
          !formattedValue.endsWith('/') && 
          value.length > (prevFormData[field]?.length || 0)) {
        formattedValue += '/';
      }
      if (formattedValue.length >= 2) {
        const dd = parseInt(formattedValue.slice(0, 2));
        if (dd > 31) formattedValue = '31' + formattedValue.slice(2);
      }
      if (formattedValue.length >= 5) {
        const mm = parseInt(formattedValue.slice(3, 5));
        if (mm > 12) formattedValue = formattedValue.slice(0, 3) + '12' + formattedValue.slice(5);
      }
      // Strict Reality Check for Years
      if (formattedValue.length === 10) {
        const year = parseInt(formattedValue.slice(6, 10));
        const currentYear = new Date().getFullYear();
        if (field === 'dob' && year > currentYear - 18) {
          formattedValue = formattedValue.slice(0, 6) + (currentYear - 18);
        } else if (field === 'dateOfIssue' && year > currentYear) {
          formattedValue = formattedValue.slice(0, 6) + currentYear;
        }
        if (year > currentYear + 50) formattedValue = formattedValue.slice(0, 6) + (currentYear + 10);
        if (year < 1900) formattedValue = formattedValue.slice(0, 6) + '1900';
      }
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
    } else if (field === 'expiry') {
      formattedValue = value.replace(/[^0-9/]/g, '');
      
      // Real-time month validation & auto-formatting
      if (formattedValue.length === 1 && parseInt(formattedValue) > 1) {
        formattedValue = '0' + formattedValue + '/';
      } else if (formattedValue.length >= 2) {
        const month = parseInt(formattedValue.slice(0, 2));
        if (month > 12) {
          formattedValue = '12' + formattedValue.slice(2);
        } else if (month === 0 && formattedValue.length === 2) {
          formattedValue = '01';
        }
      }

      if (formattedValue.length === 2 && !formattedValue.includes('/') && value.length > (prevFormData[field]?.length || 0)) {
        formattedValue += '/';
      }
    } else if (['cardholderName', 'name', 'nickname', 'bankName'].includes(field)) {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }

    // 2. Limit lengths
    if (field === 'cvv') formattedValue = formattedValue.slice(0, 4);
    if (field === 'aadhaarNumber') formattedValue = formattedValue.slice(0, 14);
    if (['dob', 'dateOfIssue', 'dateOfExpiry'].includes(field)) formattedValue = formattedValue.slice(0, 10);
    if (field === 'cardNumber') formattedValue = formattedValue.slice(0, 23);
    if (field === 'expiry') formattedValue = formattedValue.slice(0, 5);

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const [prevFormData, setPrevFormData] = useState<Record<string, string>>({});
  // Update prevFormData whenever formData changes
  useEffect(() => {
    setPrevFormData(formData);
  }, [formData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrors({});

    try {
      if (!formData.nickname) {
        setErrors(prev => ({ ...prev, nickname: 'Nickname is required' }));
        setIsSaving(false);
        return;
      }

      const schema = (CardSchemas as any)[type];
      const dataToValidate = { ...formData };
      if (dataToValidate.cardNumber) {
        dataToValidate.cardNumber = dataToValidate.cardNumber.replace(/\s/g, '');
      }
      if (dataToValidate.aadhaarNumber) {
        dataToValidate.aadhaarNumber = dataToValidate.aadhaarNumber.replace(/\s/g, '');
      }

      if (schema) {
        schema.parse(dataToValidate);
      }

      const key = vault.getKey();
      const encrypted = await encrypt(JSON.stringify(dataToValidate), key);

      const record = {
        id: uuidv4(),
        type,
        encrypted: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        updatedAt: new Date().toISOString(),
        deviceId: 'web-client',
        syncStatus: 'pending' as const
      };

      await db.saveCard(record);
      onSuccess();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        console.error('Save failed:', error);
        alert('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeName = () => {
    switch(type) {
      case 'credit': return 'Credit Card';
      case 'debit': return 'Debit Card';
      case 'aadhaar': return 'Aadhaar';
      case 'passport': return 'Passport';
      case 'driving_licence': return 'Driving Licence';
      default: return 'Card';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content">
        <header className="modal-header">
          <div className="header-labels">
            <span className="tiny-label">CARD DETAILS</span>
            <h2>{getTypeName()}</h2>
            <p className="subtitle">Enter your card information</p>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </header>

        <form onSubmit={handleSave} className="card-form">
          <div className="form-group">
            <label>Card Type</label>
            <select value={type} onChange={(e) => {
              setType(e.target.value as CardType);
              setFormData({ network: 'visa' });
              setErrors({});
            }}>
              <option value="credit">Credit Card</option>
              <option value="debit">Debit Card</option>
              <option value="aadhaar">Aadhaar</option>
              <option value="passport">Passport</option>
              <option value="driving_licence">Driving Licence</option>
            </select>
          </div>

          <FormField 
            label="Card Nickname" 
            name="nickname" 
            value={formData.nickname} 
            onChange={handleInputChange} 
            error={errors.nickname} 
            placeholder="e.g., HDFC Platinum"
          />

          {type === 'credit' || type === 'debit' ? (
            <>
              <FormField 
                label="Card Number" 
                name="cardNumber" 
                value={formData.cardNumber} 
                onChange={handleInputChange} 
                error={errors.cardNumber} 
                placeholder="•••• •••• •••• ••••" 
              />
              <div className="form-row">
                <FormField 
                  label="Expiry" 
                  name="expiry" 
                  value={formData.expiry} 
                  onChange={handleInputChange} 
                  error={errors.expiry} 
                  placeholder="MM/YY" 
                />
                <FormField 
                  label="CVV" 
                  name="cvv" 
                  type="password" 
                  value={formData.cvv} 
                  onChange={handleInputChange} 
                  error={errors.cvv} 
                  placeholder="•••" 
                />
              </div>
              <FormField 
                label="Cardholder Name" 
                name="cardholderName" 
                value={formData.cardholderName} 
                onChange={handleInputChange} 
                error={errors.cardholderName} 
                placeholder="As on card"
              />
              <FormField 
                label="Bank Name" 
                name="bankName" 
                value={formData.bankName} 
                onChange={handleInputChange} 
                error={errors.bankName} 
                placeholder="e.g. HDFC Bank"
              />
            </>
          ) : type === 'passport' ? (
            <>
              <div className="form-row">
                <FormField label="Type" name="type" value={formData.type || 'P'} onChange={handleInputChange} error={errors.type} placeholder="P" />
                <FormField label="Country Code" name="countryCode" value={formData.countryCode} onChange={handleInputChange} error={errors.countryCode} placeholder="IND" />
              </div>
              <FormField label="Passport Number" name="passportNumber" value={formData.passportNumber} onChange={handleInputChange} error={errors.passportNumber} placeholder="Z0000000" />
              <div className="form-row">
                <FormField label="Surname" name="surname" value={formData.surname} onChange={handleInputChange} error={errors.surname} />
                <FormField label="Given Name(s)" name="givenNames" value={formData.givenNames} onChange={handleInputChange} error={errors.givenNames} />
              </div>
              <div className="form-row">
                <FormField label="Sex" name="sex" value={formData.sex} onChange={handleInputChange} error={errors.sex} placeholder="M / F / X" />
                <FormField label="Nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} error={errors.nationality} placeholder="INDIAN" />
              </div>
              <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleInputChange} error={errors.dob} placeholder="DD/MM/YYYY" />
              <div className="form-row">
                <FormField label="Place of Birth" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} error={errors.placeOfBirth} />
                <FormField label="Place of Issue" name="placeOfIssue" value={formData.placeOfIssue} onChange={handleInputChange} error={errors.placeOfIssue} />
              </div>
              <div className="form-row">
                <FormField label="Date of Issue" name="dateOfIssue" value={formData.dateOfIssue} onChange={handleInputChange} error={errors.dateOfIssue} placeholder="DD/MM/YYYY" />
                <FormField label="Date of Expiry" name="dateOfExpiry" value={formData.dateOfExpiry} onChange={handleInputChange} error={errors.dateOfExpiry} placeholder="DD/MM/YYYY" />
              </div>
            </>
          ) : type === 'aadhaar' ? (
            <>
              <FormField label="Full Name" name="name" value={formData.name} onChange={handleInputChange} error={errors.name} />
              <FormField label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} error={errors.aadhaarNumber} placeholder="12 digits" />
              <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleInputChange} error={errors.dob} placeholder="DD/MM/YYYY" />
              <FormField label="Full Address" name="address" value={formData.address} onChange={handleInputChange} error={errors.address} />
            </>
          ) : null}

          <div className="encryption-notice">
            <span className="lock-icon">🔒</span>
            <p>All data is encrypted with AES-256 and stored locally on your device</p>
          </div>

          <button className="btn-save" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Card'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-content {
          max-width: 440px; width: 100%; padding: 24px;
          background: #1e1e1e; border: 1px solid #333;
          border-radius: 20px; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          display: flex; flex-direction: column;
          max-height: 90vh; overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #444 transparent;
        }
        .modal-content::-webkit-scrollbar {
          width: 6px;
        }
        .modal-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-content::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 10px;
        }
        .modal-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;
        }
        .header-labels { display: flex; flex-direction: column; gap: 0px; }
        .tiny-label { font-size: 0.6rem; font-weight: 600; color: #888; letter-spacing: 0.1em; }
        h2 { font-size: 1.3rem; margin: 0; color: #fff; }
        .subtitle { color: #888; font-size: 0.8rem; }
        .btn-close { background: none; border: none; color: #555; font-size: 20px; cursor: pointer; line-height: 1; }
        .card-form { display: flex; flex-direction: column; gap: 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        
        .encryption-notice {
          display: flex; gap: 8px; align-items: center;
          background: rgba(161, 98, 7, 0.08); border: 1px solid rgba(161, 98, 7, 0.15);
          padding: 10px; border-radius: 10px; margin-top: 2px;
        }
        .lock-icon { font-size: 0.9rem; }
        .encryption-notice p { font-size: 0.7rem; color: #d97706; line-height: 1.2; margin: 0; }
        
        .btn-save {
          background: #2a2a2a; color: #fff; border: 1px solid #444;
          padding: 12px; border-radius: 12px; font-size: 0.95rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s ease; margin-top: 4px;
        }
        .btn-save:hover { background: #333; border-color: #666; transform: translateY(-1px); }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        select {
          background: #2a2a2a; border: 1px solid #444; padding: 14px;
          border-radius: 10px; color: white; font-size: 1rem; width: 100%;
        }
      `}</style>
    </div>
  );
}

function FormField({ label, name, value, onChange, error, type = 'text', placeholder }: any) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(name, e.target.value)} 
        placeholder={placeholder}
        className={error ? 'input-error' : ''}
      />
      {error && <span className="error-text">{error}</span>}
      <style jsx>{`
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 0.9rem; color: #ccc; font-weight: 500; }
        input {
          background: #2a2a2a; border: 1px solid #444; padding: 14px;
          border-radius: 10px; color: white; font-size: 1rem; transition: all 0.2s;
          width: 100%; box-sizing: border-box;
        }
        input:focus { outline: none; border-color: #666; background: #333; }
        input::placeholder { color: #555; }
        .input-error { border-color: #ef4444 !important; }
        .error-text { color: #ef4444; font-size: 0.8rem; font-weight: 500; margin-top: 2px; }
      `}</style>
    </div>
  );
}
