/**
 * Unit Tests for Winston Logger Service
 *
 * Tests the ASCII sanitization and message truncation functionality
 * for the winston logger service.
 *
 * @module __tests__/libs/winston.service.test
 */

import {
  sanitizeToAscii,
  truncateMessage,
  processLogMessage,
} from '../../libs/winston/winston.service';

describe('Winston Logger Service', () => {
  // ============================================
  // sanitizeToAscii Tests
  // ============================================

  describe('sanitizeToAscii', () => {
    it('should return ASCII-only string unchanged', () => {
      const input = 'Hello World! This is a test message.';
      expect(sanitizeToAscii(input)).toBe(input);
    });

    it('should remove emoji characters', () => {
      const input = 'Hello 🌍 World! 🎉';
      expect(sanitizeToAscii(input)).toBe('Hello  World! ');
    });

    it('should remove unicode characters', () => {
      const input = '日本語 Test 中文';
      expect(sanitizeToAscii(input)).toBe(' Test ');
    });

    it('should handle empty string', () => {
      expect(sanitizeToAscii('')).toBe('');
    });

    it('should handle string with only non-ASCII characters', () => {
      const input = '🎉🌍🚀';
      expect(sanitizeToAscii(input)).toBe('');
    });

    it('should handle mixed ASCII and unicode correctly', () => {
      const input = 'User logged in: 用户123 ✅';
      expect(sanitizeToAscii(input)).toBe('User logged in: 123 ');
    });

    it('should keep all printable ASCII characters (32-126)', () => {
      // Test all printable ASCII characters
      const printableAscii =
        ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
      expect(sanitizeToAscii(printableAscii)).toBe(printableAscii);
    });

    it('should remove control characters', () => {
      const input = 'Hello\x00World\x1F';
      expect(sanitizeToAscii(input)).toBe('HelloWorld');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeToAscii(null as any)).toBe('');
      expect(sanitizeToAscii(undefined as any)).toBe('');
      expect(sanitizeToAscii(123 as any)).toBe('');
    });
  });

  // ============================================
  // truncateMessage Tests
  // ============================================

  describe('truncateMessage', () => {
    it('should return short message unchanged', () => {
      const input = 'Short message';
      expect(truncateMessage(input)).toBe(input);
    });

    it('should return message exactly 255 chars unchanged', () => {
      const input = 'A'.repeat(255);
      expect(truncateMessage(input)).toBe(input);
      expect(truncateMessage(input).length).toBe(255);
    });

    it('should truncate message over 255 chars with ellipsis', () => {
      const input = 'A'.repeat(300);
      const result = truncateMessage(input);
      expect(result.length).toBe(255);
      expect(result.endsWith('...')).toBe(true);
      expect(result).toBe('A'.repeat(252) + '...');
    });

    it('should handle custom max length', () => {
      const input = 'A'.repeat(100);
      const result = truncateMessage(input, 50);
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
      expect(result).toBe('A'.repeat(47) + '...');
    });

    it('should handle empty string', () => {
      expect(truncateMessage('')).toBe('');
    });

    it('should handle message just over limit', () => {
      const input = 'A'.repeat(256);
      const result = truncateMessage(input);
      expect(result.length).toBe(255);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should return empty string for non-string input', () => {
      expect(truncateMessage(null as any)).toBe('');
      expect(truncateMessage(undefined as any)).toBe('');
    });
  });

  // ============================================
  // processLogMessage Tests
  // ============================================

  describe('processLogMessage', () => {
    it('should pass through clean ASCII message under limit', () => {
      const input = 'Clean ASCII message';
      expect(processLogMessage(input)).toBe(input);
    });

    it('should sanitize and preserve short message', () => {
      const input = 'Hello 🌍 World!';
      expect(processLogMessage(input)).toBe('Hello  World!');
    });

    it('should sanitize and truncate long message with unicode', () => {
      const input = 'A'.repeat(300) + '🎉';
      const result = processLogMessage(input);
      expect(result.length).toBe(255);
      expect(result.endsWith('...')).toBe(true);
      // Should NOT contain emoji
      expect(result.includes('🎉')).toBe(false);
    });

    it('should handle unicode-only message resulting in empty string', () => {
      const input = '🎉🌍🚀';
      expect(processLogMessage(input)).toBe('');
    });

    it('should handle empty string', () => {
      expect(processLogMessage('')).toBe('');
    });

    it('should handle message that becomes shorter after sanitization', () => {
      // Message with emojis that would be over limit, but under after sanitization
      const input = '🎉'.repeat(100) + 'Short text' + '🎉'.repeat(100);
      const result = processLogMessage(input);
      expect(result).toBe('Short text');
      expect(result.length).toBeLessThan(255);
    });

    it('should handle message exactly at limit after sanitization', () => {
      const input = 'A'.repeat(255) + '🎉🎉🎉';
      const result = processLogMessage(input);
      expect(result).toBe('A'.repeat(255));
      expect(result.length).toBe(255);
    });

    it('should handle complex real-world log messages', () => {
      const input = 'User john@example.com logged in from IP 192.168.1.1 🔐';
      const expected = 'User john@example.com logged in from IP 192.168.1.1 ';
      expect(processLogMessage(input)).toBe(expected);
    });
  });
});
