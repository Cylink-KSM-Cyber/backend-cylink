// Mock the model dependency
jest.mock('@/models/urlModel', () => ({
  shortCodeExists: jest.fn(),
}));

const {
  isValidShortCode,
  sanitizeShortCode,
  generateUniqueShortCode,
} = require('@/utils/shortCode');
const { shortCodeExists } = require('@/models/urlModel');

describe('Short Code Utility', () => {
  describe('isValidShortCode', () => {
    it('should return true for valid short codes', () => {
      expect(isValidShortCode('abc123')).toBe(true);
      expect(isValidShortCode('ABC123')).toBe(true);
      expect(isValidShortCode('aBc123')).toBe(true);
    });

    it('should return false for short codes that are too short', () => {
      expect(isValidShortCode('ab')).toBe(false);
    });

    it('should return false for short codes that are too long', () => {
      expect(isValidShortCode('abcdefghijklmnopqrstuvwxyz123456')).toBe(false);
    });

    it('should return false for short codes with invalid characters', () => {
      expect(isValidShortCode('abc-123')).toBe(false);
      expect(isValidShortCode('abc_123')).toBe(false);
      expect(isValidShortCode('abc 123')).toBe(false);
    });

    it('should return true for exactly 3 characters (minimum)', () => {
      expect(isValidShortCode('abc')).toBe(true);
    });

    it('should return true for exactly 30 characters (maximum)', () => {
      expect(isValidShortCode('abcdefghijklmnopqrstuvwxyz1234')).toBe(true);
    });
  });

  describe('sanitizeShortCode', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeShortCode('abc-123')).toBe('abc123');
      expect(sanitizeShortCode('abc_123')).toBe('abc123');
      expect(sanitizeShortCode('abc 123')).toBe('abc123');
    });

    it('should truncate codes longer than 30 characters', () => {
      expect(sanitizeShortCode('abcdefghijklmnopqrstuvwxyz123456789')).toBe(
        'abcdefghijklmnopqrstuvwxyz1234',
      );
    });

    it('should return valid codes unchanged', () => {
      expect(sanitizeShortCode('abc123')).toBe('abc123');
    });
  });

  describe('generateUniqueShortCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return a unique code on first attempt if it does not exist', async () => {
      (shortCodeExists as jest.Mock).mockResolvedValueOnce(false);

      const code = await generateUniqueShortCode();

      expect(code).toBeTruthy();
      expect(code.length).toBe(6);
      expect(shortCodeExists).toHaveBeenCalledTimes(1);
    });

    it('should try again if code already exists', async () => {
      (shortCodeExists as jest.Mock).mockResolvedValueOnce(true);
      (shortCodeExists as jest.Mock).mockResolvedValueOnce(false);

      const code = await generateUniqueShortCode();

      expect(code).toBeTruthy();
      expect(shortCodeExists).toHaveBeenCalledTimes(2);
    });

    it('should throw an error after max attempts', async () => {
      // Always return true to simulate all codes existing
      (shortCodeExists as jest.Mock).mockResolvedValue(true);

      await expect(generateUniqueShortCode({ maxAttempts: 3 })).rejects.toThrow(
        'Failed to generate a unique short code after 3 attempts',
      );

      expect(shortCodeExists).toHaveBeenCalledTimes(3);
    });

    it('should respect custom options', async () => {
      (shortCodeExists as jest.Mock).mockResolvedValueOnce(false);

      const code = await generateUniqueShortCode({
        length: 4,
        prefix: 'test-',
      });

      expect(code).toMatch(/^test-[a-zA-Z0-9]{4}$/);
    });
  });
});
