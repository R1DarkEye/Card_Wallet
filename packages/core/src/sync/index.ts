import { AnyCard } from '../models';
import { EncryptedRecord, EncryptedImage } from '../../db/src/interface';

export interface SyncResult {
  upserted: number;
  deleted: number;
  errors: string[];
}

export interface RemoteProvider {
  uploadBlob(path: string, blob: string): Promise<void>;
  downloadBlob(path: string): Promise<string>;
  updateMetadata(metadata: any): Promise<void>;
  getRemoteMetadata(since: string): Promise<any[]>;
}

export class SyncEngine {
  constructor(private provider: RemoteProvider) {}

  async push(pendingCards: EncryptedRecord[], pendingImages: EncryptedImage[]): Promise<SyncResult> {
    const result: SyncResult = { upserted: 0, deleted: 0, errors: [] };

    for (const card of pendingCards) {
      try {
        const path = `cards/${card.id}.enc`;
        await this.provider.uploadBlob(path, card.encrypted);
        await this.provider.updateMetadata({
          id: card.id,
          type: card.type,
          blob_path: path,
          updated_at: card.updatedAt,
          device_id: card.deviceId
        });
        result.upserted++;
      } catch (e: any) {
        result.errors.push(`Failed to push card ${card.id}: ${e.message}`);
      }
    }

    return result;
  }

  async pull(lastSyncTime: string): Promise<any[]> {
    return await this.provider.getRemoteMetadata(lastSyncTime);
  }
}
