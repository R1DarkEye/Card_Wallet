import type { DatabaseAdapter } from './interface';
import type { EncryptedRecord, EncryptedImage } from '@cardvault/core';
import { getActiveUserId, supabase } from './supabaseClient';

const VAULT_BUCKET = 'vaults';

type CardRow = {
  id: string;
  user_id: string;
  type: string;
  blob_path: string;
  updated_at: string;
  device_id: string;
  deleted: boolean | null;
};

type ImageRow = {
  id: string;
  card_id: string;
  side: 'front' | 'back';
  blob_path: string;
  updated_at: string;
  deleted: boolean | null;
};

const getUserId = async (): Promise<string> => {
  const userId = getActiveUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
};

const uploadJson = async (path: string, payload: unknown): Promise<void> => {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const { error } = await supabase.storage.from(VAULT_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0'
  });
  if (error) throw error;
};

const downloadJson = async (path: string): Promise<any> => {
  const { data, error } = await supabase.storage.from(VAULT_BUCKET).download(path);
  if (error || !data) throw error ?? new Error('Missing vault blob');
  const text = await data.text();
  return JSON.parse(text);
};

const removeFile = async (path?: string): Promise<void> => {
  if (!path) return;
  const { error } = await supabase.storage.from(VAULT_BUCKET).remove([path]);
  if (error) throw error;
};

export class SupabaseDatabase implements DatabaseAdapter {
  async saveCard(record: EncryptedRecord): Promise<void> {
    const userId = await getUserId();
    const safeStamp = record.updatedAt.replace(/[:.]/g, '-');
    const blobPath = `${userId}/cards/${record.id}-${safeStamp}.json`;

    const { data: existing } = await supabase
      .from('card_metadata')
      .select('blob_path')
      .eq('id', record.id)
      .maybeSingle();

    const previousPath = (existing as { blob_path?: string } | null)?.blob_path;

    await uploadJson(blobPath, {
      encrypted: record.encrypted,
      iv: record.iv,
      tag: record.tag
    });

    const { error } = await supabase.from('card_metadata').upsert(
      {
        id: record.id,
        user_id: userId,
        type: record.type,
        blob_path: blobPath,
        updated_at: record.updatedAt,
        device_id: record.deviceId,
        deleted: false
      },
      { onConflict: 'id' }
    );

    if (error) throw error;

    if (previousPath && previousPath !== blobPath) {
      await removeFile(previousPath);
    }
  }

  async getCard(id: string): Promise<EncryptedRecord | undefined> {
    const { data, error } = await supabase
      .from('card_metadata')
      .select('*')
      .eq('id', id)
      .eq('deleted', false)
      .maybeSingle();

    if (error || !data) return undefined;

    try {
      const payload = await downloadJson((data as CardRow).blob_path);
      return {
        id: data.id,
        type: data.type,
        encrypted: payload.encrypted,
        iv: payload.iv,
        tag: payload.tag,
        updatedAt: data.updated_at,
        deviceId: data.device_id,
        syncStatus: 'synced'
      };
    } catch {
      return undefined;
    }
  }

  async getAllCards(): Promise<EncryptedRecord[]> {
    const { data, error } = await supabase
      .from('card_metadata')
      .select('*')
      .eq('deleted', false)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];

    const records = await Promise.all(
      (data as CardRow[]).map(async (row) => {
        try {
          const payload = await downloadJson(row.blob_path);
          return {
            id: row.id,
            type: row.type,
            encrypted: payload.encrypted,
            iv: payload.iv,
            tag: payload.tag,
            updatedAt: row.updated_at,
            deviceId: row.device_id,
            syncStatus: 'synced'
          } as EncryptedRecord;
        } catch {
          return null;
        }
      })
    );

    return records.filter(Boolean) as EncryptedRecord[];
  }

  async deleteCard(id: string): Promise<void> {
    const { data } = await supabase
      .from('card_metadata')
      .select('blob_path')
      .eq('id', id)
      .maybeSingle();

    const blobPath = (data as { blob_path?: string } | null)?.blob_path;
    await removeFile(blobPath);

    const { error } = await supabase
      .from('card_metadata')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async saveImage(image: EncryptedImage): Promise<void> {
    const userId = await getUserId();
    const blobPath = `${userId}/images/${image.cardId}/${image.id}-${image.side}.json`;

    await uploadJson(blobPath, {
      encrypted: image.encrypted,
      iv: image.iv,
      tag: image.tag
    });

    const { error } = await supabase.from('image_metadata').upsert(
      {
        id: image.id,
        card_id: image.cardId,
        side: image.side,
        blob_path: blobPath,
        updated_at: image.updatedAt,
        deleted: false
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
  }

  async getImage(id: string): Promise<EncryptedImage | undefined> {
    const { data, error } = await supabase
      .from('image_metadata')
      .select('*')
      .eq('id', id)
      .eq('deleted', false)
      .maybeSingle();

    if (error || !data) return undefined;

    try {
      const payload = await downloadJson((data as ImageRow).blob_path);
      return {
        id: data.id,
        cardId: data.card_id,
        side: data.side,
        encrypted: payload.encrypted,
        iv: payload.iv,
        tag: payload.tag,
        updatedAt: data.updated_at,
        syncStatus: 'synced'
      } as EncryptedImage;
    } catch {
      return undefined;
    }
  }

  async getImagesForCard(cardId: string): Promise<EncryptedImage[]> {
    const { data, error } = await supabase
      .from('image_metadata')
      .select('*')
      .eq('card_id', cardId)
      .eq('deleted', false)
      .order('updated_at', { ascending: false });

    if (error || !data) return [];

    const images = await Promise.all(
      (data as ImageRow[]).map(async (row) => {
        try {
          const payload = await downloadJson(row.blob_path);
          return {
            id: row.id,
            cardId: row.card_id,
            side: row.side,
            encrypted: payload.encrypted,
            iv: payload.iv,
            tag: payload.tag,
            updatedAt: row.updated_at,
            syncStatus: 'synced'
          } as EncryptedImage;
        } catch {
          return null;
        }
      })
    );

    return images.filter(Boolean) as EncryptedImage[];
  }

  async deleteImage(id: string): Promise<void> {
    const { data } = await supabase
      .from('image_metadata')
      .select('blob_path')
      .eq('id', id)
      .maybeSingle();

    const blobPath = (data as { blob_path?: string } | null)?.blob_path;
    await removeFile(blobPath);

    const { error } = await supabase
      .from('image_metadata')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getPendingChanges(): Promise<{ cards: EncryptedRecord[]; images: EncryptedImage[] }> {
    return { cards: [], images: [] };
  }

  async markAsSynced(_entityId: string, _type: 'card' | 'image'): Promise<void> {
    return;
  }
}

export const db = new SupabaseDatabase();
