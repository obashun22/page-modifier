/**
 * Plugin Utils - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generatePluginId,
  compareVersions,
  parseMatchPattern,
  matchesDomain,
  isPluginApplicable,
} from '../../../src/utils/plugin-utils';

describe('generatePluginId', () => {
  it('should convert name to lowercase kebab-case', () => {
    expect(generatePluginId('Copy Button')).toBe('copy-button');
    expect(generatePluginId('My Plugin Name')).toBe('my-plugin-name');
  });

  it('should remove non-alphanumeric characters', () => {
    expect(generatePluginId('Hello, World!')).toBe('hello-world');
    expect(generatePluginId('Test@Plugin#123')).toBe('test-plugin-123');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generatePluginId(' Test Plugin ')).toBe('test-plugin');
    expect(generatePluginId('---Plugin---')).toBe('plugin');
  });
});

describe('compareVersions', () => {
  it('should correctly compare major versions', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('should correctly compare minor versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
  });

  it('should correctly compare patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
  });

  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
  });
});

describe('parseMatchPattern', () => {
  it('should parse valid Match Pattern', () => {
    const result = parseMatchPattern('https://example.com/*');
    expect(result).toEqual({
      scheme: 'https',
      host: 'example.com',
      path: '/*',
    });
  });

  it('should parse wildcard patterns', () => {
    const result = parseMatchPattern('*://*.github.com/*');
    expect(result).toEqual({
      scheme: '*',
      host: '*.github.com',
      path: '/*',
    });
  });

  it('should return null for invalid pattern', () => {
    expect(parseMatchPattern('invalid')).toBeNull();
    expect(parseMatchPattern('')).toBeNull();
  });
});

describe('matchesDomain', () => {
  describe('Domain Pattern format', () => {
    it('should match exact domain', () => {
      expect(matchesDomain('https://github.com/user/repo', 'github.com')).toBe(true);
      expect(matchesDomain('https://github.com/', 'github.com')).toBe(true);
    });

    it('should match subdomain wildcard', () => {
      expect(matchesDomain('https://api.github.com/', '*.github.com')).toBe(true);
      expect(matchesDomain('https://gist.github.com/', '*.github.com')).toBe(true);
    });

    it('should not match base domain with subdomain wildcard', () => {
      expect(matchesDomain('https://github.com/', '*.github.com')).toBe(false);
    });

    it('should match all with * wildcard', () => {
      expect(matchesDomain('https://example.com/', '*')).toBe(true);
      expect(matchesDomain('http://github.com/', '*')).toBe(true);
    });

    it('should not match different domain', () => {
      expect(matchesDomain('https://example.com/', 'github.com')).toBe(false);
    });

    it('should match domain with path pattern', () => {
      expect(matchesDomain('https://example.com/api/users', 'example.com/api/*')).toBe(true);
      expect(matchesDomain('https://example.com/other', 'example.com/api/*')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid URLs gracefully', () => {
      expect(matchesDomain('not-a-url', 'github.com')).toBe(false);
    });
  });
});

describe('isPluginApplicable', () => {
  const createTestPlugin = (targetDomains: string[]) => ({
    id: 'test-id',
    name: 'Test Plugin',
    version: '1.0.0',
    targetDomains,
    enabled: true,
    operations: [],
  });

  it('should return true for matching domain', () => {
    const plugin = createTestPlugin(['github.com']);
    expect(isPluginApplicable(plugin, 'https://github.com/')).toBe(true);
  });

  it('should return true for matching subdomain', () => {
    const plugin = createTestPlugin(['*.github.com']);
    expect(isPluginApplicable(plugin, 'https://api.github.com/')).toBe(true);
  });

  it('should return false for non-matching domain', () => {
    const plugin = createTestPlugin(['github.com']);
    expect(isPluginApplicable(plugin, 'https://example.com/')).toBe(false);
  });

  it('should return true if any domain matches', () => {
    const plugin = createTestPlugin(['github.com', 'gitlab.com']);
    expect(isPluginApplicable(plugin, 'https://gitlab.com/')).toBe(true);
  });
});
