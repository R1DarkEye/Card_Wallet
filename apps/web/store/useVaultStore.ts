import { create } from 'zustand';
import { vault } from '@cardvault/core';

interface VaultState {
  isOpen: boolean;
  mnemonic: string | null;
  setVaultOpen: (mnemonic: string, userId: string) => Promise<void>;
  lockVault: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  isOpen: false,
  mnemonic: null,
  setVaultOpen: async (mnemonic, userId) => {
    await vault.open(mnemonic, userId);
    set({ isOpen: true, mnemonic: vault.getMnemonic() });
  },
  lockVault: () => {
    vault.lock();
    set({ isOpen: false, mnemonic: null });
  },
}));
