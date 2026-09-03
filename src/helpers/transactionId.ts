import { customAlphabet } from 'nanoid';

// Uppercase alphabet only — no digits, and critically no '-'/'_' which the
// default nanoid alphabet includes (caused IDs like TRAN-iwmzLKBh--)
const tranRandom = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

/**
 * Generate a payment transaction ID: Tran-YYYYMMDD-XXXXXX
 * (date of creation + 6 random uppercase letters)
 */
export const generateTransactionId = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `Tran-${y}${m}${d}-${tranRandom()}`;
};
