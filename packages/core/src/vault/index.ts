import { deriveKeyFromMnemonic, validateMnemonic } from '../encryption';

export class Vault {
  private encryptionKey: Uint8Array | null = null;
  private mnemonic: string | null = null;

  /**
   * Opens the vault using a mnemonic and user ID as salt
   */
  async open(mnemonic: string, userId: string): Promise<void> {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    this.mnemonic = mnemonic;
    this.encryptionKey = await deriveKeyFromMnemonic(mnemonic, userId);
  }

  /**
   * Locks the vault and wipes the key from memory
   */
  lock(): void {
    if (this.encryptionKey) {
      this.encryptionKey.fill(0); // Zero out the memory
      this.encryptionKey = null;
    }
    this.mnemonic = null;
  }

  /**
   * Returns whether the vault is currently open
   */
  isOpen(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Gets the current encryption key
   */
  getKey(): Uint8Array {
    if (!this.encryptionKey) {
      throw new Error('Vault is locked');
    }
    return this.encryptionKey;
  }

  /**
   * Gets the mnemonic (use sparingly)
   */
  getMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('Vault is locked');
    }
    return this.mnemonic;
  }
}

export const vault = new Vault();
