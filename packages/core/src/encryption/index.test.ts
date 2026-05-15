import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateMnemonic, 
  validateMnemonic, 
  deriveKeyFromMnemonic, 
  encrypt, 
  decrypt 
} from './index';

describe('Encryption Engine', () => {
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const testSalt = 'test-user-id';

  it('should generate a valid mnemonic', () => {
    const mnemonic = generateMnemonic();
    expect(validateMnemonic(mnemonic)).toBe(true);
    expect(mnemonic.split(' ').length).toBe(12);
  });

  it('should validate a known mnemonic', () => {
    expect(validateMnemonic(testMnemonic)).toBe(true);
    expect(validateMnemonic('invalid mnemonic')).toBe(false);
  });

  it('should derive a consistent 256-bit key', async () => {
    const key1 = await deriveKeyFromMnemonic(testMnemonic, testSalt);
    const key2 = await deriveKeyFromMnemonic(testMnemonic, testSalt);
    
    expect(key1).toEqual(key2);
    expect(key1.length).toBe(32);
  });

  it('should encrypt and decrypt data correctly', async () => {
    const key = await deriveKeyFromMnemonic(testMnemonic, testSalt);
    const originalData = JSON.stringify({ 
      cardNumber: '1234567812345678', 
      name: 'John Doe' 
    });

    const encrypted = await encrypt(originalData, key);
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(originalData);

    const decryptedData = await decrypt(encrypted, key);
    expect(decryptedData).toBe(originalData);
  });

  it('should fail to decrypt with wrong key', async () => {
    const key = await deriveKeyFromMnemonic(testMnemonic, testSalt);
    const wrongKey = await deriveKeyFromMnemonic(testMnemonic, 'wrong-salt');
    const originalData = 'secret message';

    const encrypted = await encrypt(originalData, key);
    
    await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
  });
});
