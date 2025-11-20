/**
 * Security Analyzer Tests
 */

import { describe, it, expect } from 'vitest';
import { SecurityAnalyzer } from '../../../src/shared/security-analyzer';
import type { Plugin } from '../../../src/shared/types';
import type { SecurityLevel } from '../../../src/shared/storage-types';

describe('SecurityAnalyzer', () => {
  const analyzer = new SecurityAnalyzer();

  describe('Safe plugins', () => {
    it('should mark simple DOM operation as SAFE', () => {
      const safePlugin: Plugin = {
        id: 'safe-plugin',
        name: 'Safe Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'update',
            params: {
              selector: '.element',
              style: {
                color: 'red',
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(safePlugin);
      expect(analysis.level).toBe('safe' as SecurityLevel);
      expect(analysis.risks).toHaveLength(0);
    });
  });

  describe('Moderate risk plugins', () => {
    it('should mark innerHTML usage as MODERATE', () => {
      const moderatePlugin: Plugin = {
        id: 'moderate-plugin',
        name: 'Moderate Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'insert',
            params: {
              selector: '#specific-element',
              position: 'beforeend',
              element: {
                tag: 'div',
                innerHTML: '<span>HTML</span>',
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(moderatePlugin);
      expect(analysis.level).toBe('moderate' as SecurityLevel);
      expect(analysis.risks).toHaveLength(1);
      expect(analysis.risks[0].type).toBe('inner_html');
    });

    it('should detect external API calls', () => {
      const apiPlugin: Plugin = {
        id: 'api-plugin',
        name: 'API Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'insert',
            params: {
              selector: 'body',
              position: 'beforeend',
              element: {
                tag: 'button',
                textContent: 'Click',
                events: [
                  {
                    type: 'click',
                    code: "fetch('https://api.example.com/data').then(r => r.json()).then(console.log);",
                  },
                ],
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(apiPlugin);
      expect(analysis.level).toBe('moderate' as SecurityLevel);
      const apiRisk = analysis.risks.find((r) => r.type === 'external_api');
      expect(apiRisk).toBeDefined();
    });
  });

  describe('Advanced risk plugins', () => {
    it('should mark custom JS as ADVANCED', () => {
      const advancedPlugin: Plugin = {
        id: 'advanced-plugin',
        name: 'Advanced Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'insert',
            params: {
              selector: 'body',
              position: 'beforeend',
              element: {
                tag: 'button',
                textContent: 'Click',
                events: [
                  {
                    type: 'click',
                    code: 'console.log("clicked")',
                  },
                ],
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(advancedPlugin);
      expect(analysis.level).toBe('advanced' as SecurityLevel);
      expect(analysis.risks.some((r) => r.type === 'custom_js')).toBe(true);
    });

    it('should detect suspicious URLs', () => {
      const suspiciousPlugin: Plugin = {
        id: 'suspicious-plugin',
        name: 'Suspicious Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'insert',
            params: {
              selector: 'body',
              position: 'beforeend',
              element: {
                tag: 'a',
                textContent: 'Link',
                events: [
                  {
                    type: 'click',
                    code: 'window.location.href = "javascript:alert(\\"xss\\")";',
                  },
                ],
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(suspiciousPlugin);
      expect(analysis.level).toBe('advanced' as SecurityLevel);
      expect(analysis.risks.some((r) => r.type === 'suspicious_url')).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations for high-risk plugins', () => {
      const riskyPlugin: Plugin = {
        id: 'risky-plugin',
        name: 'Risky Plugin',
        version: '1.0.0',
        targetDomains: ['example.com'],
        enabled: true,
        operations: [
          {
            id: 'op-1',
            description: '',
            type: 'insert',
            params: {
              selector: 'body',
              position: 'beforeend',
              element: {
                tag: 'div',
                innerHTML: '<script>alert("xss")</script>',
                events: [
                  {
                    type: 'click',
                    code: 'alert("clicked")',
                  },
                ],
              },
            },
          },
        ],
      };

      const analysis = analyzer.analyze(riskyPlugin);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });
});
