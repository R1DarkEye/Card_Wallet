import { AnyCard } from '@cardvault/core';

export interface EncryptedRecord {
  id: string;
  type: string;
  encrypted: string; // base64
  iv: string; // base64
  tag: string; // base64
  updatedAt: string;
  deviceId: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface EncryptedImage {
  id: string;
  cardId: string;
  side: 'front' | 'back';
  encrypted: string;
  iv: string;
  tag: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface DatabaseAdapter {
  // Cards
  saveCard(record: EncryptedRecord): Promise<void>;
  getCard(id: string): Promise<EncryptedRecord | undefined>;
  getAllCards(): Promise<EncryptedRecord[]>;
  deleteCard(id: string): Promise<void>;

  // Images
  saveImage(image: EncryptedImage): Promise<void>;
  getImage(id: string): Promise<EncryptedImage | undefined>;
  getImagesForCard(cardId: string): Promise<EncryptedImage[]>;
  deleteImage(id: string): Promise<void>;

  // Sync
  getPendingChanges(): Promise<{ cards: EncryptedRecord[], images: EncryptedImage[] }>;
  markAsSynced(entityId: string, type: 'card' | 'image'): Promise<void>;
}
