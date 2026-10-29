import { describe, it, expect } from 'vitest';
import { formatBytes, formatDate, formatRelativeTime, getExtensionMeta } from './formatters.ts';

describe('Frontend Formatters Utility', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes, kilobytes, and megabytes', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('formatDate', () => {
    it('should return a readable formatted date', () => {
      const iso = '2026-10-29T10:30:00.000Z';
      const formatted = formatDate(iso);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });
  });

  describe('formatRelativeTime', () => {
    it('should handle recent times', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });
  });

  describe('getExtensionMeta', () => {
    it('should return correct metadata for supported extensions', () => {
      expect(getExtensionMeta('.json').label).toBe('JSON');
      expect(getExtensionMeta('.md').label).toBe('MARKDOWN');
      expect(getExtensionMeta('.txt').label).toBe('TEXT');
    });
  });
});
