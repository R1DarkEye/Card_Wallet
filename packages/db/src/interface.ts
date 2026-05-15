import { AnyCard, EncryptedRecord, EncryptedImage } from '@cardvault/core';
export type { EncryptedRecord, EncryptedImage };

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
