/**
 * Plugin Utils Tests
 */

import { describe, it, expect } from 'vitest';
import { parseMatchPattern, matchesDomain } from '../../../src/utils/plugin-utils';

describe('parseMatchPattern', () => {
  it('should parse valid Match Pattern', () => {
    const result = parseMatchPattern('https://example.com/*');
    expect(result).toEqual({
      scheme: 'https',
      host: 'example.com',
      path: '/*',
    });
  });

  it('should parse Match Pattern with wildcard scheme', () => {
    const result = parseMatchPattern('*://example.com/*');
    expect(result).toEqual({
      scheme: '*',
      host: 'example.com',
      path: '/*',
    });
  });

  it('should parse Match Pattern with wildcard host', () => {
    const result = parseMatchPattern('https://*.example.com/*');
    expect(result).toEqual({
      scheme: 'https',
      host: '*.example.com',
      path: '/*',
    });
  });

  it('should parse <all_urls>', () => {
    const result = parseMatchPattern('<all_urls>');
    expect(result).toEqual({
      scheme: '*',
      host: '*',
      path: '/*',
    });
  });

  it('should parse http scheme', () => {
    const result = parseMatchPattern('http://example.com/*');
    expect(result).toEqual({
      scheme: 'http',
      host: 'example.com',
      path: '/*',
    });
  });

  it('should reject invalid Match Pattern (wildcard in middle)', () => {
    const result = parseMatchPattern('https://www.*.com/*');
    expect(result).toBeNull();
  });

  it('should reject invalid Match Pattern (no scheme)', () => {
    const result = parseMatchPattern('example.com/*');
    expect(result).toBeNull();
  });

  it('should reject invalid Match Pattern (invalid scheme)', () => {
    const result = parseMatchPattern('ftp://example.com/*');
    expect(result).toBeNull();
  });
});

describe('matchesDomain', () => {
  describe('Match Pattern format', () => {
    it('should match exact domain with https', () => {
      expect(matchesDomain('https://github.com/user/repo', 'https://github.com/*')).toBe(true);
      expect(matchesDomain('https://github.com/', 'https://github.com/*')).toBe(true);
    });

    it('should not match different scheme', () => {
      expect(matchesDomain('http://github.com/', 'https://github.com/*')).toBe(false);
      expect(matchesDomain('https://github.com/', 'http://github.com/*')).toBe(false);
    });

    it('should match wildcard scheme', () => {
      expect(matchesDomain('http://github.com/', '*://github.com/*')).toBe(true);
      expect(matchesDomain('https://github.com/', '*://github.com/*')).toBe(true);
    });

    it('should match subdomain wildcard', () => {
      expect(matchesDomain('https://api.github.com/', '*://*.github.com/*')).toBe(true);
      expect(matchesDomain('https://gist.github.com/', '*://*.github.com/*')).toBe(true);
    });

    it('should not match base domain with subdomain wildcard', () => {
      expect(matchesDomain('https://github.com/', '*://*.github.com/*')).toBe(false);
    });

    it('should match all URLs with *://*/*', () => {
      expect(matchesDomain('https://example.com/', '*://*/*')).toBe(true);
      expect(matchesDomain('http://github.com/path', '*://*/*')).toBe(true);
      expect(matchesDomain('https://api.example.org/v1/users', '*://*/*')).toBe(true);
    });

    it('should not match different domain', () => {
      expect(matchesDomain('https://example.com/', 'https://github.com/*')).toBe(false);
    });

    it('should match specific path patterns', () => {
      expect(matchesDomain('https://example.com/api/users', 'https://example.com/api/*')).toBe(true);
      expect(matchesDomain('https://example.com/other', 'https://example.com/api/*')).toBe(false);
    });
  });

  describe('Legacy format (domain name only)', () => {
    it('should match exact domain', () => {
      expect(matchesDomain('https://github.com/user/repo', 'github.com')).toBe(true);
      expect(matchesDomain('http://github.com/', 'github.com')).toBe(true);
      expect(matchesDomain('github.com', 'github.com')).toBe(true);
    });

    it('should match subdomain wildcard', () => {
      expect(matchesDomain('https://api.github.com/', '*.github.com')).toBe(true);
      expect(matchesDomain('https://gist.github.com/', '*.github.com')).toBe(true);
    });

    it('should not match base domain with legacy subdomain wildcard', () => {
      expect(matchesDomain('https://github.com/', '*.github.com')).toBe(false);
    });

    it('should match all with * wildcard', () => {
      expect(matchesDomain('https://example.com/', '*')).toBe(true);
      expect(matchesDomain('http://github.com/', '*')).toBe(true);
    });

    it('should match TLD wildcard', () => {
      expect(matchesDomain('https://example.com/', '*.com')).toBe(true);
      expect(matchesDomain('https://github.com/', '*.com')).toBe(true);
      expect(matchesDomain('https://example.org/', '*.com')).toBe(false);
    });

    it('should not match different domain', () => {
      expect(matchesDomain('https://example.com/', 'github.com')).toBe(false);
    });
  });

  describe('Mixed formats', () => {
    it('should handle domain name input with Match Pattern', () => {
      expect(matchesDomain('github.com', 'https://github.com/*')).toBe(true);
    });

    it('should handle URL input with legacy pattern', () => {
      expect(matchesDomain('https://github.com/user/repo', 'github.com')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid patterns gracefully', () => {
      expect(matchesDomain('https://example.com/', 'invalid-pattern')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(matchesDomain('not-a-url', 'https://example.com/*')).toBe(false);
    });
  });
});
