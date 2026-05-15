import { argon2id } from 'hash-wasm';
import * as bip39 from 'bip39';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Generates a new 12-word BIP39 mnemonic
 */
export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

/**
 * Validates a 12-word BIP39 mnemonic
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Derives a 256-bit encryption key from a mnemonic using Argon2id
 */
export async function deriveKeyFromMnemonic(
  mnemonic: string,
  salt: string
): Promise<Uint8Array> {
  const hash = await argon2id({
    password: mnemonic,
    salt: salt,
    iterations: 3,
    memorySize: 64 * 1024, // 64MB
    parallelism: 1,
    hashLength: 32, // 256-bit
    outputType: 'binary',
  });
  return hash;
}

/**
 * Encrypts data using AES-256-GCM
 */
export async function encrypt(
  data: string,
  key: Uint8Array
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedData
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  
  // In WebCrypto, the tag is appended to the ciphertext
  const tagLength = 16;
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - tagLength);
  const tag = encryptedArray.slice(encryptedArray.length - tagLength);

  return {
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    tag: Buffer.from(tag).toString('base64'),
  };
}

/**
 * Decrypts data using AES-256-GCM
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: Uint8Array
): Promise<string> {
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    combined
  );

  return new TextDecoder().decode(decryptedBuffer);
}
