'use client';

import { useState, useEffect } from 'react';
import { encrypt, vault, CardType, CardSchemas } from '@cardvault/core';
import { db } from '@cardvault/db';
import { useToast } from './Toast';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

interface AddCardModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    type: CardType;
    data: any;
  };
}

export default function AddCardModal({ onClose, onSuccess, editData }: AddCardModalProps) {
  const [showSelector, setShowSelector] = useState(!editData);
  const [type, setType] = useState<CardType>(editData?.type || 'credit');
  const [formData, setFormData] = useState<Record<string, any>>(editData?.data || {
    network: 'visa',
    nickname: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [prevFormData, setPrevFormData] = useState<Record<string, any>>(editData?.data || {});
  const { showToast, ToastElement } = useToast();

  // Update prevFormData whenever formData changes
  useEffect(() => {
    setPrevFormData(formData);
  }, [formData]);

  const handleTypeSelect = (selectedType: CardType) => {
    setType(selectedType);
    setFormData({ nickname: '', network: 'visa' });
    setShowSelector(false);
  };

  const getCardIcon = (cardType: CardType) => {
    switch (cardType) {
      case 'credit':
      case 'debit': return { emoji: '💳', bg: '#eff6ff', color: '#2563eb' };
      case 'aadhaar':
      case 'passport': return { emoji: '🪪', bg: '#f5f3ff', color: '#7c3aed' };
      case 'driving_licence': return { emoji: '🚗', bg: '#fff7ed', color: '#ea580c' };
      case 'insurance': return { emoji: '🛡️', bg: '#f0fdf4', color: '#16a34a' };
      default: return { emoji: '📄', bg: '#f8fafc', color: '#475569' };
    }
  };

  // Sync edit data into state when switching between add/edit
  useEffect(() => {
    if (editData) {
      setType(editData.type);
      setFormData({
        network: editData.data?.network || 'visa',
        nickname: editData.data?.nickname || '',
        ...editData.data
      });
      setErrors({});
      return;
    }

    setType('credit');
    setFormData({ network: 'visa', nickname: '' });
    setErrors({});
  }, [editData]);

  // Re-synchronize vehicle classes for display if they are an array
  useEffect(() => {
    if (editData?.data?.vehicleClasses && Array.isArray(editData.data.vehicleClasses)) {
      setFormData(prev => ({
        ...prev,
        vehicleClasses: editData.data.vehicleClasses.join(', ')
      }));
    }
  }, [editData]);

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
    } else if (field === 'licenceNumber') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
      formattedValue = formattedValue.replace(/\s{2,}/g, ' ').trimStart();
    } else if (field === 'issuingRTO') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
      formattedValue = formattedValue.replace(/\s{2,}/g, ' ').trimStart();
    } else if (field === 'vehicleClasses') {
      formattedValue = value.toUpperCase().replace(/[^A-Z0-9,\s/-]/g, '');
      formattedValue = formattedValue.replace(/\s{2,}/g, ' ');
    } else if (field === 'countryCode') {
      formattedValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    } else if (field === 'type') {
      formattedValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 1);
    } else if (field === 'sex') {
      const v = value.toUpperCase().replace(/[^MFX]/g, '');
      formattedValue = v.slice(0, 1);
    } else if (['dob', 'dateOfIssue', 'dateOfExpiry', 'issueDate', 'expiryDate'].includes(field)) {
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
    } else if (['cardholderName', 'name', 'nickname', 'bankName', 'provider', 'policyName', 'subscriberName', 'memberName', 'title'].includes(field)) {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    } else if (['policyNumber', 'groupNumber', 'contactNumber', 'memberId', 'identifier'].includes(field)) {
      formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    // 2. Limit lengths
    if (field === 'cvv') formattedValue = formattedValue.slice(0, 4);
    if (field === 'aadhaarNumber') formattedValue = formattedValue.slice(0, 14);
    if (['dob', 'dateOfIssue', 'dateOfExpiry', 'issueDate', 'expiryDate'].includes(field)) formattedValue = formattedValue.slice(0, 10);
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
      const dataToValidate: Record<string, any> = { ...formData };
      if (dataToValidate.cardNumber) {
        dataToValidate.cardNumber = dataToValidate.cardNumber.replace(/\s/g, '');
      }
      if (dataToValidate.aadhaarNumber) {
        dataToValidate.aadhaarNumber = dataToValidate.aadhaarNumber.replace(/\s/g, '');
      }
      if (typeof dataToValidate.vehicleClasses === 'string') {
        dataToValidate.vehicleClasses = dataToValidate.vehicleClasses
          .split(',')
          .map((item: string) => item.trim())
          .filter(Boolean);
      }

      if (schema) {
        schema.parse(dataToValidate);
      }

      const key = vault.getKey();
      const encrypted = await encrypt(JSON.stringify(dataToValidate), key);

      const record = {
        id: editData?.id || uuidv4(),
        type,
        encrypted: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        updatedAt: new Date().toISOString(),
        deviceId: 'web-client',
        syncStatus: 'pending' as const
      };

      await db.saveCard(record);
      showToast(editData ? 'Card updated successfully' : 'Card saved successfully', 'success');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        showToast('Please fix the errors in the form', 'error');
      } else {
        console.error('Save failed:', error);
        showToast('An unexpected error occurred', 'error');
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
      case 'insurance': return 'Insurance Card';
      case 'health': return 'Health Card';
      case 'other_license': return 'Professional License';
      case 'other': return 'Personal Card';
      default: return 'Card';
    }
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${showSelector ? 'selector-mode' : 'form-mode'}`}>
        {showSelector ? (
          <div className="type-selector-view">
            <header className="selector-header">
               <div className="top-nav">
                 <button className="back-btn" onClick={onClose}>← Add New Card</button>
               </div>
               <h2>What kind of card do you want to add?</h2>
               <p className="subtitle">Choose the type of card you want to store in CardVault.</p>
            </header>

            <div className="content-layout">
              <div className="main-options">
                <div className="selector-grid">
                   {[
                     { id: 'credit', label: 'Payment Card', desc: 'Credit, debit or prepaid cards', icon: '💳', bg: '#eff6ff', color: '#2563eb' },
                     { id: 'aadhaar', label: 'ID Card', desc: 'Identity cards, passports and other IDs', icon: '🪪', bg: '#f5f3ff', color: '#7c3aed' },
                     { id: 'driving_licence', label: 'Driver License', desc: "Driver's license and learner's permits", icon: '🚗', bg: '#fff7ed', color: '#ea580c' },
                     { id: 'insurance', label: 'Insurance Card', desc: 'Health, life, vehicle or other insurance cards', icon: '🛡️', bg: '#f0fdf4', color: '#16a34a' },
                     { id: 'other_license', label: 'License', desc: 'Professional, business or other licenses', icon: '📜', bg: '#fffbeb', color: '#d97706' },
                     { id: 'passport', label: 'Travel Card', desc: 'Boarding passes, travel passes and vouchers', icon: '✈️', bg: '#eff6ff', color: '#2563eb' },
                     { id: 'health', label: 'Health Card', desc: 'Medical, health and blood group cards', icon: '❤️', bg: '#fef2f2', color: '#dc2626' },
                     { id: 'other', label: 'Other Card', desc: 'Membership, loyalty and other important cards', icon: '📄', bg: '#f8fafc', color: '#475569' },
                   ].map((item) => (
                     <div key={item.id} className="selector-card" onClick={() => handleTypeSelect(item.id as CardType)}>
                       <div className="selector-icon" style={{ background: item.bg, color: item.color }}>
                         {item.icon}
                       </div>
                       <div className="selector-info">
                         <div className="selector-label">{item.label}</div>
                         <div className="selector-desc">{item.desc}</div>
                       </div>
                       <div className="selector-arrow">›</div>
                     </div>
                   ))}
                </div>
                
                <div className="selector-footer-info">
                   <div className="footer-lock-info">
                     <span className="lock-icon">🔒</span>
                     All cards you add are encrypted and stored securely. We never share your data with anyone.
                   </div>
                </div>
              </div>

              <aside className="side-panel">
                <div className="help-card">
                  <div className="help-icon">💡</div>
                  <h3>Not sure?</h3>
                  <p>You can add any card type and change it later from card details.</p>
                  <div className="illustration">
                    <div className="card-stack">
                      <div className="card-item blue"></div>
                      <div className="card-item orange"></div>
                      <div className="card-item purple"></div>
                    </div>
                  </div>
                </div>

                <div className="features-list">
                  <h3>Why store with CardVault?</h3>
                  <div className="feature-item">
                    <span className="feature-icon secure">🛡️</span>
                    <div>
                      <h4>Bank-level encryption</h4>
                      <p>Your data is always protected</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon private">🔒</span>
                    <div>
                      <h4>Secure & Private</h4>
                      <p>Only you have access</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon backup">☁️</span>
                    <div>
                      <h4>Auto Backup</h4>
                      <p>Never lose your important cards</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon sync">💻</span>
                    <div>
                      <h4>Access Anywhere</h4>
                      <p>View your cards on all devices</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="form-mode-container">
            <header className="modal-header">
              <div className="header-labels">
                <button className="back-btn-inline" onClick={() => !editData && setShowSelector(true)}>← <span>{getTypeName()}</span></button>
                <p className="subtitle">{editData ? 'Update your card information' : 'Enter your card information'}</p>
              </div>
              <button className="btn-close" onClick={onClose}>×</button>
            </header>

            <form onSubmit={handleSave} className="card-form-scroll">
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
              ) : type === 'driving_licence' ? (
                <>
                  <FormField label="Full Name" name="name" value={formData.name} onChange={handleInputChange} error={errors.name} />
                  <div className="form-row">
                    <FormField label="Licence Number" name="licenceNumber" value={formData.licenceNumber} onChange={handleInputChange} error={errors.licenceNumber} placeholder="XX00 2025 1234567" />
                    <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleInputChange} error={errors.dob} placeholder="DD/MM/YYYY" />
                  </div>
                  <FormField label="Address" name="address" value={formData.address} onChange={handleInputChange} error={errors.address} />
                  <div className="form-row">
                    <FormField label="Date of Issue" name="issueDate" value={formData.issueDate} onChange={handleInputChange} error={errors.issueDate} placeholder="DD/MM/YYYY" />
                    <FormField label="Date of Expiry" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} error={errors.expiryDate} placeholder="DD/MM/YYYY" />
                  </div>
                  <div className="form-row">
                    <FormField label="Issuing RTO" name="issuingRTO" value={formData.issuingRTO} onChange={handleInputChange} error={errors.issuingRTO} placeholder="e.g., MH12" />
                    <FormField label="Vehicle Classes" name="vehicleClasses" value={formData.vehicleClasses} onChange={handleInputChange} error={errors.vehicleClasses} placeholder="LMV, MCWG" />
                  </div>
                </>
              ) : type === 'aadhaar' ? (
                <>
                  <FormField label="Full Name" name="name" value={formData.name} onChange={handleInputChange} error={errors.name} />
                  <FormField label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleInputChange} error={errors.aadhaarNumber} placeholder="12 digits" />
                  <div className="form-group">
                    <label>Gender</label>
                    <select 
                      value={formData.gender || ''} 
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className={errors.gender ? 'input-error' : ''}
                      style={{
                        background: '#f8fafc',
                        border: '2px solid #f1f5f9',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        color: '#1e293b',
                        fontSize: '15px',
                        width: '100%',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && <span className="error-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.gender}</span>}
                  </div>
                  <FormField label="Date of Birth" name="dob" value={formData.dob} onChange={handleInputChange} error={errors.dob} placeholder="DD/MM/YYYY" />
                  <FormField label="Full Address" name="address" value={formData.address} onChange={handleInputChange} error={errors.address} />
                </>
              ) : type === 'insurance' ? (
                <>
                  <FormField label="Insurance Provider" name="provider" value={formData.provider} onChange={handleInputChange} error={errors.provider} placeholder="e.g., Blue Cross" />
                  <div className="form-row">
                    <FormField label="Policy Number" name="policyNumber" value={formData.policyNumber} onChange={handleInputChange} error={errors.policyNumber} placeholder="XYZ123456" />
                    <FormField label="Group Number" name="groupNumber" value={formData.groupNumber} onChange={handleInputChange} error={errors.groupNumber} placeholder="Optional" />
                  </div>
                  <FormField label="Policy Name" name="policyName" value={formData.policyName} onChange={handleInputChange} error={errors.policyName} placeholder="Optional" />
                  <FormField label="Subscriber Name" name="subscriberName" value={formData.subscriberName} onChange={handleInputChange} error={errors.subscriberName} />
                  <div className="form-row">
                    <FormField label="Effective Date" name="effectiveDate" value={formData.effectiveDate} onChange={handleInputChange} error={errors.effectiveDate} placeholder="DD/MM/YYYY" />
                    <FormField label="Expiry Date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} error={errors.expiryDate} placeholder="DD/MM/YYYY" />
                  </div>
                  <FormField label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} error={errors.contactNumber} placeholder="Customer Service" />
                </>
              ) : type === 'health' ? (
                <>
                  <FormField label="Provider Name" name="provider" value={formData.provider} onChange={handleInputChange} error={errors.provider} placeholder="e.g., Apollo Health" />
                  <FormField label="Member Name" name="memberName" value={formData.memberName} onChange={handleInputChange} error={errors.memberName} placeholder="Full Name" />
                  <div className="form-row">
                    <FormField label="Member ID" name="memberId" value={formData.memberId} onChange={handleInputChange} error={errors.memberId} placeholder="Policy/Member #" />
                    <FormField label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} error={errors.bloodGroup} placeholder="e.g., O+" />
                  </div>
                  <FormField label="Emergency Contact" name="emergencyContact" value={formData.emergencyContact} onChange={handleInputChange} error={errors.emergencyContact} placeholder="Phone number" />
                  <FormField label="Valid Until" name="validUntil" value={formData.validUntil} onChange={handleInputChange} error={errors.validUntil} placeholder="DD/MM/YYYY" />
                </>
              ) : type === 'other' || type === 'other_license' ? (
                <>
                  <FormField label="Card Title" name="title" value={formData.title} onChange={handleInputChange} error={errors.title} placeholder="e.g., Library Card" />
                  <FormField label="ID / Number" name="identifier" value={formData.identifier} onChange={handleInputChange} error={errors.identifier} placeholder="Registration or ID number" />
                  <FormField label="Expiry Date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} error={errors.expiryDate} placeholder="DD/MM/YYYY" />
                  <div className="form-group">
                    <label>Additional Details</label>
                    <textarea 
                      name="details" 
                      value={formData.details || ''} 
                      onChange={(e) => handleInputChange('details', e.target.value)}
                      placeholder="Any other specific info..."
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        marginTop: '4px',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              ) : null}

              <div className="form-footer">
                <div className="security-note">
                  <span className="lock-icon">🔒</span>
                  All data is encrypted with AES-256 and stored securely in your vault
                </div>
                <button type="submit" className="btn-save" disabled={isSaving}>
                  {isSaving ? 'Encrypting...' : editData ? 'Update Card' : 'Save Card'}
                </button>
              </div>
            </form>
            {ToastElement}
          </div>
        )}

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            z-index: 1000;
          }
          .modal-content {
            background: #fff;
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          .selector-mode { max-width: 1400px; padding: 40px 60px; overflow-y: auto; }
          .form-mode { max-width: 600px; margin: 0 auto; }

          /* Header should be sticky in form mode */
          .form-mode-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          .modal-header {
            padding: 40px 60px 20px;
            background: #fff;
            z-index: 10;
            border-bottom: 1px solid #f1f5f9;
            flex-shrink: 0;
          }
          .card-form-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 20px 60px 100px; /* Large bottom padding for the save button */
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
          }
          .card-form-scroll::-webkit-scrollbar { width: 6px; }
          .card-form-scroll::-webkit-scrollbar-track { background: transparent; }
          .card-form-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

          /* Selector View Styles */
          .type-selector-view { width: 100%; }
          .selector-header { margin-bottom: 40px; }
          .top-nav { margin-bottom: 24px; }
          .back-btn {
            background: none;
            border: none;
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .selector-header h2 { font-size: 32px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
          .selector-header .subtitle { color: #64748b; font-size: 16px; }

          .content-layout {
            display: grid;
            grid-template-columns: 1.8fr 1fr;
            gap: 48px;
          }

          .selector-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
          .selector-card {
            display: flex;
            align-items: center;
            padding: 24px;
            background: #fff;
            border: 2px solid #f1f5f9;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }
          .selector-card:hover {
            border-color: #2563eb;
            background: #fff;
            box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.05);
            transform: translateY(-2px);
          }
          .selector-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-right: 20px;
            flex-shrink: 0;
          }
          .selector-info { flex: 1; }
          .selector-label { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
          .selector-desc { font-size: 13px; color: #64748b; line-height: 1.5; }
          .selector-arrow { color: #2563eb; font-size: 20px; opacity: 0.5; transition: all 0.2s; }
          .selector-card:hover .selector-arrow { opacity: 1; }

          .selector-footer-info {
            background: #f0f7ff;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #e0f2fe;
          }
          .footer-lock-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            color: #0369a1;
            font-weight: 500;
          }

          /* Side Panel */
          .side-panel {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .help-card {
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 20px;
            padding: 24px;
            position: relative;
            overflow: hidden;
          }
          .help-icon { font-size: 24px; margin-bottom: 12px; }
          .help-card h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
          .help-card p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 20px; }
          
          .illustration {
            height: 100px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
          }
          .card-stack {
            position: relative;
            width: 140px;
            height: 90px;
          }
          .card-item {
            position: absolute;
            width: 120px;
            height: 75px;
            border-radius: 10px;
            bottom: 0;
            left: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .card-item.blue { background: #2563eb; transform: rotate(-10deg); z-index: 1; }
          .card-item.orange { background: #f97316; transform: rotate(5deg) translate(10px, -5px); z-index: 2; }
          .card-item.purple { background: #7c3aed; transform: translate(5px, -10px); z-index: 3; }

          .features-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .features-list h3 { font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .feature-item {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .feature-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 16px;
            background: #f1f5f9;
          }
          .feature-item h4 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
          .feature-item p { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }

          /* Form View Styles */
          .modal-header {
            padding: 32px;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .back-btn-inline {
            background: none;
            border: none;
            color: #0f172a;
            font-size: 24px;
            font-weight: 800;
            padding: 0;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 6px;
          }
          .back-btn-inline span { font-size: 24px; }
          .btn-close {
            background: #f1f5f9;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-close:hover { background: #e2e8f0; color: #0f172a; }
          
          .card-form { padding: 32px; }
          .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          
          .form-footer { margin-top: 32px; }
          .security-note {
            background: #fff7ed;
            border-radius: 16px;
            padding: 20px;
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: #9a3412;
            margin-bottom: 24px;
            line-height: 1.5;
            border: 1px solid #ffedd5;
          }
          .btn-save {
            width: 100%;
            background: #2563eb;
            color: white;
            border: none;
            padding: 18px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
          }
          .btn-save:hover { background: #1d4ed8; transform: translateY(-1px); }
          .btn-save:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

          @media (max-width: 768px) {
            .selector-grid { grid-template-columns: 1fr; }
            .type-selector-view { padding: 24px; }
            .modal-content { border-radius: 20px; }
          }

          .modal-content::-webkit-scrollbar {
            width: 6px;
          }
          .modal-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .modal-content::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .modal-content::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
        `}</style>
      </div>
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
        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        label { font-size: 14px; color: #475569; font-weight: 600; }
        input {
          background: #f8fafc; border: 2px solid #f1f5f9; padding: 14px 18px;
          border-radius: 12px; color: #1e293b; font-size: 15px; transition: all 0.2s;
          width: 100%; box-sizing: border-box;
        }
        input:focus { outline: none; border-color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
        input::placeholder { color: #94a3b8; }
        .input-error { border-color: #ef4444 !important; }
        .error-text { color: #ef4444; font-size: 13px; font-weight: 500; margin-top: 4px; }
      `}</style>
    </div>
  );
}
