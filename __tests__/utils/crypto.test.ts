/**
 * Unit tests for utils/crypto.ts
 * @group utils
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

async function importCrypto() {
  vi.resetModules();
  const mod = await import('../../src/utils/crypto');
  // CommonJS interop: exports are under default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).default ?? mod;
}

describe('utils/crypto', () => {
  it('hash() returns a non-empty hash string', async () => {
    const cryptoUtils = await importCrypto();
    const hash = await cryptoUtils.hash('password123!');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe('password123!');
  });

  it('compare() returns true for matching string and hash', async () => {
    const cryptoUtils = await importCrypto();
    const plain = 'mySecret$123';
    const hash = await cryptoUtils.hash(plain);
    const isMatch = await cryptoUtils.compare(plain, hash);
    expect(isMatch).toBe(true);
  });

  it('compare() returns false for non-matching string and hash', async () => {
    const cryptoUtils = await importCrypto();
    const hash = await cryptoUtils.hash('original');
    const isMatch = await cryptoUtils.compare('different', hash);
    expect(isMatch).toBe(false);
  });

  it('hashing the same value twice produces different hashes (random salt)', async () => {
    const cryptoUtils = await importCrypto();
    const h1 = await cryptoUtils.hash('repeatable');
    const h2 = await cryptoUtils.hash('repeatable');
    expect(h1).not.toBe(h2);
  });

  it('handles empty string hashing and comparison', async () => {
    const cryptoUtils = await importCrypto();
    const emptyHash = await cryptoUtils.hash('');
    const isMatch = await cryptoUtils.compare('', emptyHash);
    expect(isMatch).toBe(true);
  });
});
