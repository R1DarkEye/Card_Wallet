import Dexie, { Table } from 'dexie';
import { DatabaseAdapter, EncryptedRecord, EncryptedImage } from '../interface';

export class WebDatabase extends Dexie implements DatabaseAdapter {
  cards!: Table<EncryptedRecord, string>;
  images!: Table<EncryptedImage, string>;

  constructor() {
    super('CardVault');
    this.version(1).stores({
      cards: 'id, type, syncStatus, updatedAt',
      images: 'id, cardId, syncStatus, updatedAt'
    });
  }

  async saveCard(record: EncryptedRecord): Promise<void> {
    await this.cards.put(record);
  }

  async getCard(id: string): Promise<EncryptedRecord | undefined> {
    return await this.cards.get(id);
  }

  async getAllCards(): Promise<EncryptedRecord[]> {
    return await this.cards.toArray();
  }

  async deleteCard(id: string): Promise<void> {
    await this.transaction('rw', [this.cards, this.images], async () => {
      await this.cards.delete(id);
      await this.images.where('cardId').equals(id).delete();
    });
  }

  async saveImage(image: EncryptedImage): Promise<void> {
    await this.images.put(image);
  }

  async getImage(id: string): Promise<EncryptedImage | undefined> {
    return await this.images.get(id);
  }

  async getImagesForCard(cardId: string): Promise<EncryptedImage[]> {
    return await this.images.where('cardId').equals(cardId).toArray();
  }

  async deleteImage(id: string): Promise<void> {
    await this.images.delete(id);
  }

  async getPendingChanges(): Promise<{ cards: EncryptedRecord[]; images: EncryptedImage[] }> {
    const cards = await this.cards.where('syncStatus').equals('pending').toArray();
    const images = await this.images.where('syncStatus').equals('pending').toArray();
    return { cards, images };
  }

  async markAsSynced(entityId: string, type: 'card' | 'image'): Promise<void> {
    if (type === 'card') {
      await this.cards.update(entityId, { syncStatus: 'synced' });
    } else {
      await this.images.update(entityId, { syncStatus: 'synced' });
    }
  }
}

export const db = new WebDatabase();
